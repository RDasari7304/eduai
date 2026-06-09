from collections import defaultdict
from http.client import HTTPException

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from openai import AsyncOpenAI
from starlette.responses import StreamingResponse, PlainTextResponse
import hashlib
import numpy as np
import json
import re
from database import upsert_concept, init_db, get_db, embedding_encode, fetch_explanations_by_concept, build_concept_tree, tree_to_string, upsert_analysis, fetch_analyses, save_explanation, fetch_explanations_by_url, fetch_enrichment, save_enrichment, fetch_all_concepts, find_explored_concept

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

DISCIPLINES = [
    "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
    "History", "Literature", "Psychology", "Economics", "Engineering",
    "Medicine", "Philosophy", "Geography", "Sociology", "Political Science",
    "Art", "Music", "Linguistics"
]

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

asyncai = AsyncOpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

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

class FlashCard(BaseModel):
    front: str
    back: str

class KnowledgeUpdate(BaseModel):
    url: str
    concepts: list[Concept]
    topic: str | None = None
    summary: str | None = None
    flashcards: list[FlashCard] | None = None
    key_concepts: list[str] | None = None

class ProblemRequest(BaseModel):
    topic: str
    difficulty: str
    concepts: list[str] | None = None

class ExplainRequest(BaseModel):
    text: str
    heading: str
    context: str | None = None
    url: str
    subject: str | None = None

class PracticeRequest(BaseModel):
    topic: str
    difficulty: str
    concepts: list[str] | None = None

from typing import Any

responseCache: dict[str, Any] = {}


async def create_response(
    system_role,
    user_role,
    json_mode=False,
    temperature=0.3
):
    kwargs = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_role},
            {"role": "user", "content": user_role}
        ],
        "temperature": temperature
    }

    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
        kwargs["temperature"] = min(temperature, 0.4)

    response = await asyncai.chat.completions.create(**kwargs)

    return response.choices[0].message.content

async def create_response_stream(
    system_role,
    user_role,
    cache_key=None,
    oncomplete=None,
    json_mode=False,
    temperature=0.3
):
    kwargs = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_role},
            {"role": "user", "content": user_role}
        ],
        "stream": True,
        "temperature": temperature
    }

    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    openai_response = await asyncai.chat.completions.create(**kwargs)

    async def generate():
        cachestr = ""

        async for chunk in openai_response:
            if chunk.choices[0].delta.content:
                cachestr += chunk.choices[0].delta.content
                yield chunk.choices[0].delta.content

        if cache_key:
            responseCache[cache_key] = cachestr

        if oncomplete:
            oncomplete(cachestr)

    return StreamingResponse(generate(), media_type="text/plain")

@app.get("/")
def read_root():
    init_db()
    return {"Hello": "World"}

@app.post("/practice/single")
async def generate_single_practice(request: PracticeRequest):
    prompt = prompt = f"""
        Generate exactly ONE practice problem.

        Topic:
        {', '.join(request.concepts) if request.concepts else request.topic}

        Difficulty:
        {request.difficulty}

        Return EXACTLY:

        ===PROBLEM===
        DIFFICULTY: {request.difficulty.capitalize()}
        QUESTION: ...
        SOLUTION:
        Step 1: ...
        Step 2: ...
        Step 3: ...

        Rules:
        - No markdown
        - No JSON
        - No extra text
        - No introduction
        - No conclusion
    """

    completion = await asyncai.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You generate practice problems. Return only the requested format."},
            {"role": "user", "content": prompt},
        ],
    )
    return PlainTextResponse(completion.choices[0].message.content)

@app.post("/practice")
async def generate_practice(request: PracticeRequest):
    sys_role = """
        You generate practice problems.

        Generate EXACTLY 10 problems.

        Every problem MUST follow:

        ===PROBLEM===
        DIFFICULTY: Easy|Medium|Hard
        QUESTION: ...
        SOLUTION:
        Step 1: ...
        Step 2: ...
        Step 3: ...

        Rules:
        - Start every problem with ===PROBLEM===
        - Generate exactly 10 problems
        - Do not number problems
        - Do not use markdown
        - Do not output JSON
        - Do not include explanations outside the format
        - Keep difficulty consistent with the request
    """
    user_role = f"""Generate exactly 10 practice problems.

    Topic: {request.topic}
    Difficulty: {request.difficulty}
    {f"Focus on: {', '.join(request.concepts)}" if request.concepts else "Cover the topic broadly."}"""

    completion = await asyncai.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.6,
        messages=[
            {"role": "system", "content": sys_role},
            {"role": "user", "content": user_role},
        ],
        stream=True,
    )

    async def generate():
        async for chunk in completion:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    return StreamingResponse(generate(), media_type="text/plain")
      

@app.post("/explain")
async def explain_concept(request: ExplainRequest):
    # ── Check cache first ──
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT explanation FROM explanations WHERE url = ? AND selected_text = ?",
        (request.url, request.text),
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        cached_text = row["explanation"] if isinstance(row, dict) or hasattr(row, "keys") else row[0]
        async def stream_cached():
            yield cached_text
        return StreamingResponse(stream_cached(), media_type="text/plain")

    sys_role = """
        You are a tutor explaining content a student clicked on.

        PRIORITY: Focus exclusively on what the student selected.
        The surrounding context is provided ONLY to clarify ambiguous terms.
        NEVER pivot to problems, equations, or topics that appear in the context but were NOT selected.

        FIRST, classify what the student selected using these rules:

        It IS A PROBLEM/EQUATION if ANY of these are true:
        - It contains an equals sign with mathematical expressions
        - It contains integral signs, summation signs, or differential equations
        - It contains words like solve, find, compute, evaluate, simplify, or prove
        - It appears inside a block labeled Example or Problem
        - The surrounding context asks a question about it
        - It is a formula, identity, or theorem — show HOW to derive or verify it

        It IS A CONCEPT only if:
        - It is a term, definition, or named idea with NO mathematical operations
        - Examples: chain rule, mitosis, opportunity cost

        When in doubt, choose PROBLEM/EQUATION. Students clicking on math want steps, not definitions.

        THEN, respond with the matching format:

        Always begin with: "Topic: [short title, max 6 words]"

        FORMAT FOR PROBLEMS/EQUATIONS:
        Approach: [one sentence strategy]

        Step 1: [action with reasoning]

        Step 2: [action with reasoning]

        (continue numbered steps, each separated by blank lines)

        Final answer: [clearly stated]

        FORMAT FOR CONCEPTS:
        Definition: [one clear sentence]

        Why it matters: [2-3 sentences on relevance]

        How it works: [paragraph on mechanism]

        Example: [concrete worked example]

        Key insight: [one memorable takeaway]

        Rules:
        - ALWAYS separate sections with blank lines
        - Use ONLY these exact labels. No others.
        - Each step on its own paragraph
        - NEVER wrap section labels in markdown formatting. Write "Approach:" NOT "**Approach:**"
        - Use LaTeX for all math expressions. Wrap inline math in \\(...\\) and display math in \\[...\\]. Use proper LaTeX commands: \\frac{a}{b}, \\sqrt{x}, \\int, \\sum, \\omega, \\pi, x^2, x_n, etc.
        Always use LaTeX for any mathematical notation, never plain text math."""
        
    user_role = user_role = f"""The student clicked on this specific text and wants it explained if concept or solved if problem:

        ═══ SELECTED TEXT (explain or solve this) ═══
        {request.text}
        ═══════════════════════════════════

        Background only (do NOT solve or explain anything from here):
        Section heading: {request.heading}
        Surrounding text: {request.context}

        Your job is to explain ONLY the selected text above. 
        Ignore anything in the background that isn't directly needed to understand the selection. 
        Never solve problems from the background context."""
    
    def on_explanation_complete(text):
        conn = get_db()
        cursor = conn.cursor()
        lines = text.lstrip().split('\n', 1)
        ai_topic = ''
        body = text
        if lines[0].lower().startswith('topic:'):
            ai_topic = lines[0][len('topic:'):].strip()
            body = lines[1] if len(lines) > 1 else ''

        concept_id = find_explored_concept(ai_topic, request.subject, cursor)
        print(concept_id)
        save_explanation(request.url, request.text, ai_topic or request.heading, request.context, body, concept_id, cursor=cursor)

        conn.commit()
        conn.close()

    response = await create_response_stream(sys_role, user_role, oncomplete= on_explanation_complete)

    return response

@app.get("/explanations")
async def get_explanations(urls: str = '', concept_id: str | None = None, topic: str | None = None):
    conn = get_db()
    cursor = conn.cursor()

    explanations = []

    if topic:
        row = cursor.execute("SELECT id FROM concepts WHERE name = ?", (topic,)).fetchone()
        if row:
            parent_id = row[0] if not hasattr(row, 'keys') else row['id']
            descendant_ids = [parent_id]
            queue = [parent_id]
            while queue:
                current = queue.pop()
                children = cursor.execute(
                    "SELECT id FROM concepts WHERE parentid = ?", (current,)
                ).fetchall()
                for child in children:
                    child_id = child[0] if not hasattr(child, 'keys') else child['id']
                    descendant_ids.append(child_id)
                    queue.append(child_id)

            placeholders = ','.join('?' * len(descendant_ids))
            explanations = cursor.execute(
                f"SELECT id, selected_text, heading, context, explanation, created_at FROM explanations WHERE concept_id IN ({placeholders}) ORDER BY created_at DESC",
                descendant_ids
            ).fetchall()

    elif concept_id:
        explanations = fetch_explanations_by_concept(concept_id, cursor)

    elif urls:
        url_list = urls.split(',')
        explanations = fetch_explanations_by_url(url_list, cursor)

    conn.close()
    return {"explanations": [dict(row) for row in explanations]}

@app.delete("/explanations/{exp_id}")
async def delete_explanation(exp_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM explanations WHERE id = ?", (exp_id,))
    conn.commit()
    conn.close()
    return {"deleted": exp_id}

@app.post("/explanations/enrich")
async def enrich_explanation(request: ExplainRequest):
    conn = get_db()
    cursor = conn.cursor()
    row = fetch_enrichment(request.url, request.text, cursor)

    if row and row[0] and row[1]:
        cached_examples = json.loads(row["examples_json"]) if isinstance(row, dict) or hasattr(row, "keys") else json.loads(row[0])
        cached_concepts = json.loads(row["related_concepts_json"]) if isinstance(row, dict) or hasattr(row, "keys") else json.loads(row[1])
        conn.close()
        return {"examples": cached_examples, "related_concepts": cached_concepts}

    sys_role = """
        You are generating supplementary study material.

        Return ONLY a single valid JSON object.
        Do not use markdown fences.
        Do not use explanations.
        Do not write any text before or after the JSON.

        Schema:

        {
        "examples": [
            {
            "difficulty": "Easy",
            "question": "...",
            "solution": "..."
            },
            {
            "difficulty": "Medium",
            "question": "...",
            "solution": "..."
            },
            {
            "difficulty": "Hard",
            "question": "...",
            "solution": "..."
            }
        ],
        "related_concepts": [
            "concept1",
            "concept2",
            "concept3",
            "concept4",
            "concept5",
            "concept6"
        ]
        }

        Rules:

        - Exactly 3 examples: Easy, Medium, Hard.
        - Questions and solutions must relate directly to the selected concept.
        - related_concepts must contain exactly 6 short noun phrases.
        - All strings must be valid JSON strings.
        - Escape all double quotes inside strings.
        - Escape all newline characters as \\n.
        - Do not include literal line breaks inside JSON string values.
        - In solution strings, separate each step with a literal \n character
        - Start each logical step on its own line
        - Never write a solution as one continuous paragraph
        - Format: "Step 1 text.\nStep 2 text.\nStep 3 text."

        Math formatting rules:

        - Use LaTeX for mathematical expressions.
        - Because the output is JSON, EVERY LaTeX backslash must be escaped.

        Examples:

        Correct:
        "solution": "Compute \\\\frac{a}{b}"

        Correct:
        "question": "Solve \\\\(x^2+1=0\\\\)"

        Correct:
        "solution": "Apply \\\\sqrt{x}"

        Incorrect:
        "solution": "Compute \\frac{a}{b}"

        Incorrect:
        "question": "Solve \\(x^2+1=0\\)"

        Before finishing, verify that the entire response is valid JSON that can be parsed by Python json.loads().
        """

    user_role = f"Generate enrichment for this concept:\n\nSelected: {request.text}\nSection: {request.heading}"

    raw = await create_response(
        sys_role,
        user_role,
        json_mode=True,
        temperature=0.2
    )
    # Defensive parsing — same pattern as your other endpoints
    cleaned = raw.replace("```json", "").replace("```", "").strip()

    cleaned = re.sub(
        r'(?<!\\)\\(?!["\\/bfnrtu])',
        r'\\\\',
        cleaned
    )
    try:
        parsed = json.loads(cleaned, strict=False)
    except json.JSONDecodeError:
        # Fall back to substring between first { and last }
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            parsed = json.loads(cleaned[start:end + 1], strict=False)
        else:
            parsed = {"examples": [], "related_concepts": []}

    examples = parsed.get("examples", [])
    related = parsed.get("related_concepts", [])

    save_enrichment(request.url, request.text, examples, related, cursor)
    conn.commit()
    conn.close()
    return {"examples": examples, "related_concepts": related}

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
    existing_concepts = fetch_all_concepts(cursor)


    sys_role = """You are a helpful assistant that analyzes the 
             context of the webpage and provides insightful feedback. 
             Provide the response in a JSON format with the following keys: 
             'topic' - a short string identifying the main topic, 
             'subject' - the academic category such as Biology, History, Computer Science, 
             'summary' - a 2 to 3 sentence overview of the page content on a single line, 
             'keyConcepts' - a list of key concepts, 
             'flashcards' - an array of 5 flashcard objects each with a front and back, 
             'concepts' - Place this page into the existing knowledge graph. Follow these rules IN ORDER:

                STEP 1: Identify the discipline from this list: Mathematics, Physics, Chemistry, Biology, Computer Science, History, Literature, Psychology, Economics, Engineering, Medicine, Philosophy, Geography, Sociology, Political Science, Art, Music, Linguistics.

                STEP 2: Look at the EXISTING KNOWLEDGE GRAPH below. Find the deepest existing node where this page's topic logically belongs as a child. A page about a technique, method, operation, theorem, or specific concept MUST be nested under the broader topic it belongs to — it is NEVER a sibling of that broader topic.

                STEP 3: Only if no suitable parent exists beyond the discipline itself, create the page topic as a new child of the discipline.

                STEP 4: Add 2-4 subtopics as children of the page topic.

                Each concept has 'name', 'subject', and 'parent'. Maximum 6 concepts total. Reuse existing concept names exactly when they match.

                CRITICAL: The structure is Discipline → [existing intermediate topics if any] → Page Topic → Subtopics. Do NOT skip intermediate levels.

                EXAMPLE — existing graph has:
                Mathematics
                    └── Linear Algebra
                        ├── Basis
                        └── Vector Space

                Page is about "Matrix Multiplication".

                WRONG (creates a sibling of Linear Algebra):
                [{name: "Mathematics", parent: null}, {name: "Matrix Multiplication", parent: "Mathematics"}, {name: "Scalar Multiplication", parent: "Matrix Multiplication"}]

                RIGHT (nests under Linear Algebra where it belongs):
                [{name: "Mathematics", parent: null}, {name: "Linear Algebra", parent: "Mathematics"}, {name: "Matrix Multiplication", parent: "Linear Algebra"}, {name: "Scalar Multiplication", parent: "Matrix Multiplication"}]

                WRONG (page about "Photosynthesis" becomes sibling of "Cell Biology"):
                [{name: "Biology", parent: null}, {name: "Photosynthesis", parent: "Biology"}]

                RIGHT (nests under Cell Biology):
                [{name: "Biology", parent: null}, {name: "Cell Biology", parent: "Biology"}, {name: "Photosynthesis", parent: "Cell Biology"}]

                The test: if an existing topic in the graph is a prerequisite for, a superset of, or the field that contains the page topic, the page topic MUST be a child of it, not a sibling.
             Respond with raw JSON only. 
             No markdown fences. No code blocks. Keep all string values on a single line with no line breaks inside them."""
    
    user_role = user_role = f"""EXISTING KNOWLEDGE GRAPH (you MUST nest new concepts under existing nodes where they logically belong):
    {tree_str if tree_str else 'Empty — no concepts yet.'}

    Analyze the following article and provide insights:

    Title: {article.title}
    URL: {article.full_url}
    Hostname: {article.hostname}
    Path Name: {article.path_name}
    Content: {(article.frameContent or '')[:12000]}"""

    conn.close()
    return await create_response_stream(
        sys_role,
        user_role,
        cache_key=url_hash,
        json_mode=True,
        temperature=0.1
    )
    

@app.post('/generate-problems')
async def generateProblems(request: ProblemRequest):

    sys_role = """
    You are a tutor generating practice problems.

    Generate exactly 4 practice problems.

    Difficulty rules:
    - If difficulty is Mixed:
    - 1 Easy
    - 2 Medium
    - 1 Hard
    - Otherwise generate all problems at the requested difficulty.

    Return a JSON object with this schema:

    {
    "problems": [
        {
        "question": "string",
        "solution": "string",
        "difficulty": "Easy|Medium|Hard"
        }
    ]
    }

    Requirements:
    - Exactly 4 problems.
    - Order from easiest to hardest.
    - Solutions must be step-by-step.
    - Use semicolons to separate steps.
    - Keep all values on a single line.
    - Questions should test understanding of the topic.
    - For math/science include calculations when appropriate.
    """

    user_role = f"""
    Topic: {request.topic}

    Difficulty: {request.difficulty}

    {f"Focus on: {', '.join(request.concepts)}"
    if request.concepts else "Cover a broad range of subtopics."}
    """

    return await create_response_stream(
            sys_role,
            user_role,
            json_mode=True,
            temperature=0.4
    )


@app.get('/knowledge/test')
async def get_knowledge_test():
    conn = get_db()
    cursor = conn.cursor()
    concept_tree = build_concept_tree(cursor)
    tree_str = tree_to_string(concept_tree)

    print(tree_str)
    conn.close()
    return {"base": concept_tree.pop(list(concept_tree.keys())[1])}


@app.get('/knowledge/graph')
async def getKnowledge():
    conn = get_db()
    cursor = conn.cursor()

    base_dictionary = build_concept_tree(cursor)

    conn.close()
    return base_dictionary

@app.get('/knowledge/analyses')
async def getPageAnalyses(urls: str):
    conn = get_db()
    cursor = conn.cursor()

    query = urls.split(',')
    analyses = fetch_analyses(query, cursor)

    conn.close()
    return analyses

async def check_parent_placement(concept_name: str, existing_topics: list[str], discipline: str) -> str | None:
    try:
        response = await asyncai.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=30,
            messages=[
                {
                    "role": "system",
                    "content": "You classify concepts into topic hierarchies. Reply with ONLY a topic name from the provided list, or the word none. No explanation, no punctuation, no extra text."
                },
                {
                    "role": "user",
                    "content": f"""Discipline: {discipline}

            Existing topics under {discipline}: {', '.join(existing_topics)}

            New concept: {concept_name}

            Does "{concept_name}" logically belong UNDER one of the existing topics listed above?
            A concept belongs under a topic if that topic is a broader field that contains it.

            Reply with ONLY the parent topic name, or "none"."""
                            }
                        ]
                    )

        result = response.choices[0].message.content.strip().strip('"').strip("'").strip(".")
        
        # Match against existing topics case-insensitively
        for topic in existing_topics:
            if result.lower() == topic.lower():
                return topic

        return None
    except Exception:
        return None


@app.post('/knowledge/update')
async def updateKnowledge(update: KnowledgeUpdate):
    conn = get_db()
    cursor = conn.cursor()

    concept_map = {c.name: c for c in update.concepts}

    for concept in update.concepts:
        if concept.parent in DISCIPLINES or concept.parent is None:
            existing_topics = cursor.execute(
                "SELECT c.name FROM concepts c JOIN concepts p ON c.parentid = p.id WHERE p.name = ?",
                (concept.subject,)
            ).fetchall()
            topic_names = [row[0] if not hasattr(row, 'keys') else row['name'] for row in existing_topics]

            if topic_names:
                new_parent = await check_parent_placement(concept.name, topic_names, concept.subject)
                if new_parent:
                    concept.parent = new_parent

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

        op, concept_hash = upsert_concept(name, subject, parent_id, update.url, cursor, name_to_embedding[name], all_existing, 0.85 if parent_id is None else 0.8)
        id_map[name] = concept_hash

        if op == "new":
            new_count += 1
        else:
            update_count += 1
    
    if update.summary:
        flashcards = [flashcard.model_dump() for flashcard in update.flashcards] if update.flashcards else []
        upsert_analysis(update.url, update.topic, update.summary, flashcards, update.key_concepts or [], cursor)

    conn.commit()
    conn.close()
    return {"new_concepts": new_count, "updated_concepts": update_count}


@app.get("/knowledge/concepts")
async def get_child_concepts(topic: str | None = None, id:str | None = None):
    conn = get_db()
    cursor = conn.cursor()
    rows = []
    query = """
            SELECT
                c.id,
                c.name,
                c.status,
                c.mastery_score,
                c.times_encountered,
                c.quiz_correct,
                c.quiz_incorrect,
                c.first_seen,
                c.last_seen,
                c.parentid,
                COUNT(sc.id) AS subtopic_count
            FROM concepts c
            LEFT JOIN concepts sc
                ON sc.parentid = c.id
            WHERE c.parentid = ?
            GROUP BY
                c.id,
                c.name,
                c.status,
                c.mastery_score,
                c.times_encountered,
                c.quiz_correct,
                c.quiz_incorrect,
                c.first_seen,
                c.last_seen,
                c.parentid
            ORDER BY c.name
            """

    if id:
        rows = cursor.execute(
            query
            , (id, )).fetchall()
    else:
        parent = cursor.execute(
            "SELECT id FROM concepts WHERE name = ?",
            (topic,)
        ).fetchone()


        if not parent:
            raise HTTPException(status_code=404, detail="Topic not found")

        
        rows = cursor.execute(
                query,
                (parent['id'],)
        ).fetchall()


    return [dict(row) for row in rows]
