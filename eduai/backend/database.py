import sqlite3
import os
import hashlib
import datetime

def get_db():
    return sqlite3.connect('eduai.db')

def init_db():
    conn = sqlite3.connect('eduai.db')
    cursor = conn.cursor()

    CREATE_CONCEPTS_TABLE = '''
    CREATE TABLE IF NOT EXISTS concepts (
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
        status          TEXT DEFAULT 'new'
    );
    '''
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

    cursor.execute(CREATE_CONCEPTS_TABLE)
    cursor.execute(CREATE_ENCOUNTERS_TABLE)
    cursor.execute(CREATE_QUIZ_RESULTS_TABLE)
    cursor.execute(CREATE_RELATIONSHIPS_TABLE)
    cursor.execute(CREATE_STUDY_SESSIONS_TABLE)