import sqlite3
import os
import hashlib
from datetime import datetime
import json
import numpy as np
from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
disciplines = ['Mathematics', 
               'Physics', 
               'Chemistry', 
               'Biology', 
               'Computer Science', 
               'History', 'Literature',
                 'Psychology', 'Economics',
                   'Engineering', 'Medicine', 
                   'Philosophy', 'Geography', 
                   'Sociology', 'Political Science', 
                   'Art', 'Music', 'Linguistics']

def embedding_encode(text):
    return embedding_model.encode(text, normalize_embeddings=True)

def compare_embeddings(embedding1, embedding2):
    return embedding1.dot(embedding2)

def get_db():
    conn = sqlite3.connect('eduai.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = sqlite3.connect('eduai.db')
    cursor = conn.cursor()

    # Foreign key constraints ensures that parentid exists when concept is inserted
    CREATE_CONCEPTS_TABLE = '''
    CREATE TABLE IF NOT EXISTS concepts (
        parentid        TEXT DEFAULT NULL,
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        subject         TEXT NOT NULL,
        mastery_score   REAL DEFAULT 0.0,
        times_encountered INTEGER DEFAULT 0,
        first_seen      TEXT NOT NULL,
        last_seen       TEXT NOT NULL,
        total_time_spent REAL DEFAULT 0.0,
        sources         TEXT DEFAULT '[]',
        quiz_correct    INTEGER DEFAULT 0,
        quiz_incorrect  INTEGER DEFAULT 0,
        confidence_sum  REAL DEFAULT 0.0,
        status          TEXT DEFAULT 'new',
        embedding       TEXT DEFAULT '[]',
        FOREIGN KEY (parentid) REFERENCES concepts(id)
    );
    '''

    cursor.execute(CREATE_CONCEPTS_TABLE)
    discipline_embeddings = embedding_encode(disciplines)
    
    CREATE_DISCIPLINE_STMT = '''
    INSERT OR IGNORE into concepts (id, name, subject, first_seen, last_seen, embedding) 
    values (?, ?, ?, ?, ?, ?)
    '''
    for i in range(len(disciplines)):
        discipline = disciplines[i]
        discipline_hash = hashlib.sha256(discipline.lower().strip().encode()).hexdigest()
        time = datetime.utcnow().isoformat()

        cursor.execute(CREATE_DISCIPLINE_STMT, (discipline_hash,
                                               discipline,
                                               discipline,
                                               time,
                                               time,
                                               json.dumps(discipline_embeddings[i].tolist())))
    

    CREATE_ENCOUNTERS_TABLE = '''
    CREATE TABLE IF NOT EXISTS encounters (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        concept_id      TEXT NOT NULL,
        url             TEXT NOT NULL,
        timestamp       TEXT NOT NULL,
        time_spent_seconds REAL DEFAULT 0.0,
        FOREIGN KEY (concept_id) REFERENCES concepts(id)
    );
    '''

    CREATE_QUIZ_RESULTS_TABLE = '''
    CREATE TABLE IF NOT EXISTS quiz_results (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        concept_id      TEXT NOT NULL,
        question        TEXT NOT NULL,
        correct         BOOLEAN NOT NULL,
        confidence      INTEGER DEFAULT 3,
        timestamp       TEXT NOT NULL,
        FOREIGN KEY (concept_id) REFERENCES concepts(id)
    );
    '''

    CREATE_RELATIONSHIPS_TABLE = '''
    CREATE TABLE IF NOT EXISTS relationships (
        concept_a_id    TEXT NOT NULL,
        concept_b_id    TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        strength        REAL DEFAULT 1.0,
        PRIMARY KEY (concept_a_id, concept_b_id, relationship_type),
        FOREIGN KEY (concept_a_id) REFERENCES concepts(id),
        FOREIGN KEY (concept_b_id) REFERENCES concepts(id)
    );
    '''

    CREATE_STUDY_SESSIONS_TABLE = '''
    CREATE TABLE IF NOT EXISTS study_sessions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time      TEXT NOT NULL,
        end_time        TEXT,
        urls_visited    TEXT DEFAULT '[]',
        concepts_encountered TEXT DEFAULT '[]',
        total_time_seconds REAL DEFAULT 0.0
    );

    '''

    cursor.execute(CREATE_ENCOUNTERS_TABLE)
    cursor.execute(CREATE_QUIZ_RESULTS_TABLE)
    cursor.execute(CREATE_RELATIONSHIPS_TABLE)
    cursor.execute(CREATE_STUDY_SESSIONS_TABLE)
    conn.commit()
    conn.close()

def fetch_all_concepts(cursor):
    return cursor.execute(
        '''SELECT id, parentid, name, subject, mastery_score, times_encountered, status from
            concepts'''
    ).fetchall()

def build_concept_tree(cursor):
    knowledge = fetch_all_concepts(cursor)

    node_map = {concept['id']: {'parentid': concept['parentid'], 
                       'subject': concept['subject'], 'name': concept['name'], 'children': []} for concept in knowledge}
    
    for concept in knowledge:
        if concept['parentid'] is None:
            continue

        if concept['parentid'] in node_map:
            node_map[concept['parentid']]['children'].append(node_map[concept['id']])
    
    node_map = {k: v for k,v in node_map.items() if v['parentid'] is None}
    return node_map

def tree_to_string(tree):
    def format_node(node, depth):
        return " " * depth + node['name'] + "\n" + "".join([format_node(child_node, depth + 1) for child_node in node['children']]) 

    result = ""
    for parent in tree.values():
        result += format_node(parent, 0)

    return result


def upsert_concept(name, subject, parent, url, cursor, embedding, all_concepts, threshold=0.7):
    conceptHash = hashlib.sha256(name.lower().strip().encode()).hexdigest()

    time = datetime.utcnow().isoformat()
    similarConcept = find_similar_concept(embedding, all_concepts)

    operationPerformed = ""

    if similarConcept is not None:
        print(f'{name} -> {similarConcept[3]}')
        print(f'score: {similarConcept[1]}')

    if similarConcept is not None and similarConcept[1] >= threshold:
        operationPerformed = "update"
        matched_id = similarConcept[0]
    else:
        exists = cursor.execute("SELECT EXISTS(SELECT 1 FROM concepts WHERE id = ?)", (conceptHash,)).fetchone()
        if exists[0] == 1:
            operationPerformed = "update"
            matched_id = conceptHash
        else:
            matched_id = None

    if matched_id is None:
        operationPerformed = "new"
        cursor.execute(
            "INSERT INTO concepts(parentid, id, name, subject, first_seen, last_seen, times_encountered, sources, embedding) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
            (parent, conceptHash, name, subject, time, time, json.dumps([url]), json.dumps(embedding.tolist()))
        )
    else:
        row = cursor.execute("SELECT sources FROM concepts WHERE id = ?", (matched_id,)).fetchone()
        sources = json.loads(row["sources"])
        if url not in sources:
            sources.append(url)
        cursor.execute(
            "UPDATE concepts SET times_encountered = times_encountered + 1, last_seen = ?, sources = ? WHERE id = ?",
            (time, json.dumps(sources), matched_id)
        )

    return operationPerformed, matched_id if matched_id else conceptHash


def find_similar_concept(concept_embedding, all_concepts):
    similarities_results = []
    for concept in all_concepts:
        embedding = np.array(json.loads(concept['embedding']))
        similarities_results.append((concept['id'], compare_embeddings(concept_embedding, embedding), embedding, concept['name']))

    if not similarities_results:
        return None

    return max(similarities_results, key=lambda x: x[1])
