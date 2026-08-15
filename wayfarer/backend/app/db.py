import sqlite3
import os
import json
from datetime import datetime

# Path to the sqlite database
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "history.db")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT,
            rounds INTEGER,
            report TEXT,
            sources TEXT,
            timestamp TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_search(topic: str, rounds: int, report: str, sources: list):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO searches (topic, rounds, report, sources, timestamp) VALUES (?, ?, ?, ?, ?)",
        (topic, rounds, report, json.dumps(sources), datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

def get_searches():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, topic, rounds, report, sources, timestamp FROM searches ORDER BY timestamp DESC")
    rows = c.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        results.append({
            "id": r[0],
            "topic": r[1],
            "rounds": r[2],
            "report": r[3],
            "sources": json.loads(r[4]) if r[4] else [],
            "timestamp": r[5]
        })
    return results

def delete_search(search_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM searches WHERE id = ?", (search_id,))
    conn.commit()
    conn.close()

def clear_searches():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM searches")
    conn.commit()
    conn.close()
