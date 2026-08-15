import sqlite3
import chromadb
from chromadb.config import Settings
import os
import json
from rank_bm25 import BM25Okapi

# Set up local directories for persistent storage
DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DB_DIR, exist_ok=True)

# --- 1. SQLite Setup ---
# Used for storing original text, section titles, and page numbers
sqlite_path = os.path.join(DB_DIR, "metadata.db")
conn = sqlite3.connect(sqlite_path, check_same_thread=False)
cursor = conn.cursor()
cursor.execute('''
    CREATE TABLE IF NOT EXISTS chunks (
        chunk_id TEXT PRIMARY KEY,
        text TEXT,
        page_num INTEGER,
        section_title TEXT,
        doc_id TEXT
    )
''')
cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        name TEXT,
        is_pinned BOOLEAN DEFAULT 0,
        is_archived BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')
cursor.execute('''
    CREATE TABLE IF NOT EXISTS messages (
        msg_id TEXT PRIMARY KEY,
        session_id TEXT,
        role TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    )
''')
cursor.execute('''
    CREATE TABLE IF NOT EXISTS documents (
        doc_id TEXT PRIMARY KEY,
        session_id TEXT,
        filename TEXT,
        FOREIGN KEY(session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    )
''')
# Enable foreign keys
cursor.execute("PRAGMA foreign_keys = ON")
conn.commit()

# --- 2. ChromaDB Setup ---
# Used for dense vector retrieval
from chromadb.utils import embedding_functions

chroma_client = chromadb.PersistentClient(path=os.path.join(DB_DIR, "chroma"))

# Explicitly use Nomic's embedding model for better semantic representation
nomic_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="nomic-ai/nomic-embed-text-v1.5",
    trust_remote_code=True
)

doc_collection = chroma_client.get_or_create_collection(
    name="doc_chunks",
    embedding_function=nomic_ef,
    metadata={"hnsw:space": "cosine"}
)

# --- 3. BM25 Setup ---
# Used for sparse retrieval. Rebuilt on startup from SQLite.
def load_bm25():
    cursor.execute("SELECT chunk_id, text FROM chunks")
    rows = cursor.fetchall()
    if not rows:
        return None, [], []
    
    chunk_ids = [r[0] for r in rows]
    corpus = [r[1] for r in rows]
    tokenized_corpus = [doc.split(" ") for doc in corpus]
    bm25 = BM25Okapi(tokenized_corpus)
    return bm25, chunk_ids, corpus

bm25_index, bm25_ids, _ = load_bm25()

def refresh_bm25():
    global bm25_index, bm25_ids
    bm25_index, bm25_ids, _ = load_bm25()

def save_document(doc_id: str, session_id: str, filename: str):
    """Saves document metadata to SQLite."""
    cursor.execute(
        "INSERT OR IGNORE INTO documents (doc_id, session_id, filename) VALUES (?, ?, ?)",
        (doc_id, session_id, filename)
    )
    conn.commit()

def save_chunk(chunk_id: str, text: str, page_num: int, section_title: str, doc_id: str, filename: str, session_id: str):
    """Saves a chunk to both SQLite and ChromaDB."""
    # 1. Save Chunk to SQLite
    cursor.execute(
        "INSERT OR REPLACE INTO chunks (chunk_id, text, page_num, section_title, doc_id) VALUES (?, ?, ?, ?, ?)",
        (chunk_id, text, page_num, section_title, doc_id)
    )
    conn.commit()
    
    # 2. Save to Chroma
    # We pass the raw text; Chroma automatically embeds it using its default model
    doc_collection.upsert(
        documents=[text],
        metadatas=[{"page_num": page_num, "section_title": section_title, "doc_id": doc_id}],
        ids=[chunk_id]
    )

def get_chunk_by_id(chunk_id: str):
    """Fetch original chunk data from SQLite."""
    cursor.execute("""
        SELECT c.chunk_id, c.text, c.page_num, c.section_title, c.doc_id, d.filename 
        FROM chunks c 
        LEFT JOIN documents d ON c.doc_id = d.doc_id
        WHERE c.chunk_id = ?
    """, (chunk_id,))
    row = cursor.fetchone()
    if row:
        return {
            "chunk_id": row[0],
            "text": row[1],
            "page_num": row[2],
            "section_title": row[3],
            "doc_id": row[4],
            "filename": row[5] if row[5] else "Unknown"
        }
    return None

def get_documents_by_session(session_id: str):
    """Returns a list of all documents for a given session."""
    cursor.execute("SELECT doc_id, filename FROM documents WHERE session_id = ?", (session_id,))
    rows = cursor.fetchall()
    return [{"doc_id": r[0], "filename": r[1]} for r in rows]

def delete_document(doc_id: str):
    """Deletes a document and all its chunks from the database."""
    # 1. Delete from SQLite
    cursor.execute("DELETE FROM documents WHERE doc_id = ?", (doc_id,))
    cursor.execute("DELETE FROM chunks WHERE doc_id = ?", (doc_id,))
    conn.commit()
    
    # 2. Delete from ChromaDB
    try:
        doc_collection.delete(where={"doc_id": doc_id})
    except Exception:
        pass
        
    # 3. Refresh BM25
    refresh_bm25()

def clear_db():
    """Wipes the entire database to allow for single-document mode."""
    cursor.execute("DELETE FROM chunks")
    conn.commit()
    
    try:
        chroma_client.delete_collection(name="doc_chunks")
    except Exception:
        pass
        
    global doc_collection
    doc_collection = chroma_client.get_or_create_collection(
        name="doc_chunks",
        embedding_function=nomic_ef,
        metadata={"hnsw:space": "cosine"}
    )
    refresh_bm25()

def delete_session(session_id: str):
    """Deletes a session and ALL its associated messages, documents, chunks, and physical files."""
    # 1. Get all documents for this session to delete files and chunks
    cursor.execute("SELECT doc_id, filename FROM documents WHERE session_id = ?", (session_id,))
    doc_rows = cursor.fetchall()
    
    for row in doc_rows:
        doc_id = row[0]
        filename = row[1]
        
        # Delete from Chroma
        try:
            doc_collection.delete(where={"doc_id": doc_id})
        except Exception:
            pass
            
        # Delete physical file from disk
        physical_filename = f"{doc_id}_{filename}"
        filepath = os.path.join(os.path.dirname(__file__), "data", "documents", physical_filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                print(f"Error deleting file {filepath}: {e}")
                
        cursor.execute("DELETE FROM chunks WHERE doc_id = ?", (doc_id,))
            
    cursor.execute("DELETE FROM documents WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    refresh_bm25()

def get_sessions():
    cursor.execute("SELECT session_id, name, is_pinned, is_archived, created_at FROM sessions ORDER BY is_pinned DESC, created_at DESC")
    rows = cursor.fetchall()
    return [{"session_id": r[0], "name": r[1], "is_pinned": bool(r[2]), "is_archived": bool(r[3]), "created_at": r[4]} for r in rows]

def create_session(session_id: str, name: str):
    cursor.execute("INSERT INTO sessions (session_id, name) VALUES (?, ?)", (session_id, name))
    conn.commit()

def update_session(session_id: str, is_pinned: bool = None, is_archived: bool = None, name: str = None):
    if is_pinned is not None:
        cursor.execute("UPDATE sessions SET is_pinned = ? WHERE session_id = ?", (int(is_pinned), session_id))
    if is_archived is not None:
        cursor.execute("UPDATE sessions SET is_archived = ? WHERE session_id = ?", (int(is_archived), session_id))
    if name is not None:
        cursor.execute("UPDATE sessions SET name = ? WHERE session_id = ?", (name, session_id))
    conn.commit()

def save_message(msg_id: str, session_id: str, role: str, content: str):
    cursor.execute("INSERT INTO messages (msg_id, session_id, role, content) VALUES (?, ?, ?, ?)", (msg_id, session_id, role, content))
    conn.commit()

def get_messages(session_id: str):
    cursor.execute("SELECT msg_id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
    rows = cursor.fetchall()
    return [{"msg_id": r[0], "role": r[1], "content": r[2], "created_at": r[3]} for r in rows]
