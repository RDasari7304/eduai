from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from openai import AsyncOpenAI
from starlette.responses import StreamingResponse
import hashlib
import numpy as np
import json

from database import upsert_concept, init_db, get_db, embedding_encode, build_concept_tree, tree_to_string

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


load_dotenv()
Mistal_api_key = os.getenv("MISTRAL_API_KEY")

asyncai = AsyncOpenAI(api_key= Mistal_api_key, base_url="https://api.mistral.ai/v1")

class Article(BaseModel):
    title: str
    full_url: str
    hostname: str
    path_name: str
    textContent: str | None = None
    frameContent: str | None = None

class Concept(BaseModel):
    name: str
    subject: str
    parent: str | None = None

class KnowledgeUpdate(BaseModel):
    url: str
    concepts: list[Concept]

responseCache: dict[str, any] = {}

@app.get("/")
def read_root():
    init_db()
    return {"Hello": "World"}

@app.post("/analyze")
async def analyze_article(article: Article):
    url_hash = hashlib.sha256(article.full_url.encode() + (article.frameContent or "").encode()).hexdigest()

    if url_hash in responseCache:
        cached_response = responseCache[url_hash]
        return StreamingResponse(iter([cached_response]), media_type="text/plain")

    conn = get_db()
    cursor = conn.cursor()
    concept_tree = build_concept_tree(cursor)
    tree_str = tree_to_string(concept_tree)

    openai_response = await asyncai.chat.completions.create(  
        model = "open-mistral-7b",
        messages= [
            {"role": "system", "content": """You are a helpful assistant that analyzes the 
             context of the webpage and provides insightful feedback. 
             Provide the response in a JSON format with the following keys: 
             'topic' - a short string identifying the main topic, 
             'subject' - the academic category such as Biology, History, Computer Science, 
             'summary' - a 2 to 3 sentence overview of the page content on a single line, 
             'keyConcepts' - a list of key concepts, 
             'flashcards' - an array of 5 flashcard objects each with a front and back, 
             'concepts' - an array of academic concepts organized into exactly 3 levels of 
             hierarchy: Discipline, Topic, Subtopic. 
             The top-level parent must be one of these academic disciplines: 
             Mathematics, Physics, Chemistry, Biology, Computer Science, History,
              Literature, Psychology, Economics, Engineering, Medicine, Philosophy, 
             Geography, Sociology, Political Science, Art, Music, Linguistics. 
             Each concept entry has 'name', 'subject', and 'parent'. 
             Level 1 (Discipline) has parent null. 
             Level 2 (Topic like Calculus or Thermodynamics) has a Discipline as parent. 
             Level 3 (Subtopic like Chain Rule or Wave Equation) has a Topic as parent. 
             Never create roots that are not from the discipline list. 
             Return discipline and topic entries as their own concepts so the hierarchy is complete. 
             Merge related specifics into one concept. 
             If the existing knowledge graph already has the relevant topics, 
             use those exact names as parents. 
             Respond with raw JSON only. 
             No markdown fences. No code blocks. Keep all string values on a single line with no line breaks inside them."""},
            {"role": "user", "content": f"Analyze the following article and provide insights:\n\nTitle: {article.title}\nURL: {article.full_url}\nHostname: {article.hostname}\nPath Name: {article.path_name}\nContent: {(article.frameContent or '')[:3000]}" + (f"\n\nExisting knowledge graph:\n{tree_str}" if tree_str else "")}
        ],
        stream = True
    );

    async def generate():
        cachestr = ""
        async for chunk in openai_response:
            if chunk.choices[0].delta.content:
                cachestr += chunk.choices[0].delta.content
                yield chunk.choices[0].delta.content
        
        # Cache the response using a hash of the URL as the key
        responseCache[url_hash] = cachestr
    
    return StreamingResponse(generate(), media_type="text/plain")

@app.get('/knowledge/test')
async def get_knowledge_test():
    conn = get_db()
    cursor = conn.cursor()
    concept_tree = build_concept_tree(cursor)
    tree_str = tree_to_string(concept_tree)

    print(tree_str)
    return {"base": concept_tree.pop(list(concept_tree.keys())[1])}


# @app.get('/knowledge/reconstruct')
# async def reconstructKnowledge():
#     conn = get_db()
#     cursor = conn.cursor()

#     orphans = cursor.execute('''SELECT id, name, subject, embedding FROM concepts where parentid is NULL''').fetchall()
#     parents = cursor.execute(
#         '''SELECT parentid, id, name, subject, embedding FROM concepts where id IN (SELECT DISTINCT parentid from concepts where parentid is not NULL)'''
#     ).fetchall()

#     orphan_embedding_matrix = np.array([json.loads(orphan['embedding']) for orphan in orphans])
#     parent_embedding_matrix = np.array([json.loads(parent['embedding']) for parent in parents])

#     similarity_matrix = compare_embeddings(orphan_embedding_matrix, parent_embedding_matrix.T)
#     mask = np.array([
#         [orphans[i]['name'] != parents[j]['name'] and parents[j]['parentid'] != orphans[i]['id']
#         for j in range(len(parents))]
#         for i in range(len(orphans))
#     ])

#     masked_similarity_matrix = np.where(mask, similarity_matrix, -np.inf)

#     for i, parent_idx in enumerate(np.argmax(masked_similarity_matrix, axis = 1)):
#         score = masked_similarity_matrix[i][parent_idx]
#         print(f'{orphans[i]['name']} -> {parents[parent_idx]['name']} {score}')
#         if score >= 0.78:
#             print(f'{orphans[i]['name']} -> {parents[parent_idx]['name']}')

#     return {'status': 'done fetching'}

    

@app.get('/knowledge/graph')
async def getKnowledge():
    conn = get_db()
    cursor = conn.cursor()

    base_dictionary = build_concept_tree(cursor)

    conn.close()
    print(base_dictionary)
    return base_dictionary

@app.post('/knowledge/update')
async def updateKnowledge(update: KnowledgeUpdate):
    conn = get_db()
    cursor = conn.cursor()

    concept_map = {c.name: c for c in update.concepts}

    implicit_parents = set()
    for c in update.concepts:
        if c.parent and c.parent not in concept_map:
            implicit_parents.add(c.parent)
    
    all_names = [c.name for c in update.concepts] + list(implicit_parents)
    all_embeddings = embedding_encode(all_names)
    name_to_embedding = dict(zip(all_names, all_embeddings))
    all_existing = cursor.execute("SELECT id, name, embedding from concepts").fetchall()

    def get_depth(name):
        if name in implicit_parents:
            return 0
        concept = concept_map.get(name)
        if not concept or not concept.parent:
            return 0
        if concept.parent in implicit_parents:
            return 1
        parent = concept_map.get(concept.parent)
        if not parent or not parent.parent:
            return 1

        return 2

    ordered = sorted(all_names, key=get_depth)
    id_map = {}
    new_count, update_count = 0, 0

    for name in ordered:
        concept = concept_map.get(name)
        subject = concept.subject if concept else update.concepts[0].subject
        parent_name = concept.parent if concept else None
        parent_id = id_map.get(parent_name) if parent_name else None


        op, concept_hash = upsert_concept(name, subject, parent_id, update.url, cursor, name_to_embedding[name], all_existing, 0.8 if parent_id is None else 0.75)
        id_map[name] = concept_hash

        if op == "new":
            new_count += 1
        else:
            update_count += 1
        

    conn.commit()
    conn.close()
    return {"new_concepts": new_count, "updated_concepts": update_count}
