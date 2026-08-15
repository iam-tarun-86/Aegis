from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Response
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import os
import shutil
import uuid

from retrieval import retrieve
from llm import rewrite_query, generate_answer_stream, verify_claims
from ingest import process_document, ingest_document
from db import (
    delete_document, get_documents_by_session,
    get_sessions, create_session, update_session, delete_session,
    get_messages, save_message
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/ingest")
async def ingest_file(session_id: str = Form(...), file: UploadFile = File(...)):
    doc_id = str(uuid.uuid4())
    upload_dir = os.path.join(os.path.dirname(__file__), "data", "documents")
    os.makedirs(upload_dir, exist_ok=True)
    
    filepath = os.path.join(upload_dir, f"{doc_id}_{file.filename}")
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        chunks_added = ingest_document(filepath, session_id, doc_id, original_filename=file.filename)
        return {"status": "success", "message": f"Processed {file.filename}", "chunks": chunks_added}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/sessions")
async def api_get_sessions():
    return get_sessions()

from pydantic import BaseModel
class CreateSessionReq(BaseModel):
    session_id: str
    name: str

@app.post("/sessions")
async def api_create_session(req: CreateSessionReq):
    try:
        create_session(req.session_id, req.name)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class UpdateSessionReq(BaseModel):
    is_pinned: bool = None
    is_archived: bool = None
    name: str = None

@app.patch("/sessions/{session_id}")
async def api_update_session(session_id: str, req: UpdateSessionReq):
    update_session(session_id, is_pinned=req.is_pinned, is_archived=req.is_archived, name=req.name)
    return {"status": "success"}

@app.delete("/sessions/{session_id}")
async def api_delete_session(session_id: str):
    delete_session(session_id)
    return {"status": "success"}

@app.get("/sessions/{session_id}/messages")
async def api_get_messages(session_id: str):
    return get_messages(session_id)

@app.get("/sessions/{session_id}/export")
async def api_export_session(session_id: str):
    messages = get_messages(session_id)
    markdown_content = f"# Chat Export: {session_id}\n\n"
    for msg in messages:
        role = "User" if msg["role"] == "user" else "Doc-QA-Agent"
        markdown_content += f"### {role}\n{msg['content']}\n\n---\n\n"
        
    return Response(
        content=markdown_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=export_{session_id}.md"}
    )

@app.get("/documents")
async def list_documents(session_id: str = None):
    if session_id:
        return get_documents_by_session(session_id)
    return []

@app.delete("/documents/{doc_id}")
async def remove_document(doc_id: str):
    try:
        delete_document(doc_id)
        return {"status": "success", "message": f"Deleted document {doc_id}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/documents/{doc_id}/content")
async def get_document_content(doc_id: str):
    import sqlite3
    db_path = os.path.join(os.path.dirname(__file__), "data", "metadata.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT filename FROM documents WHERE doc_id = ?", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return Response(status_code=404, content="Document not found")
        
    filename = row[0]
    filepath = os.path.join(os.path.dirname(__file__), "data", "documents", f"{doc_id}_{filename}")
    
    if os.path.exists(filepath):
        return FileResponse(filepath)
    return Response(status_code=404, content="File not found on disk")

@app.websocket("/chat")
async def chat_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            session_id = payload.get("session_id", "")
            query = payload.get("query", "")
            doc_ids = payload.get("doc_ids", [])
            
            if not query or not session_id:
                continue

            # 1. Query Analysis
            queries = rewrite_query(query)
            # Use the first expanded query or original for retrieval
            search_query = queries[0] if queries else query
            
            # 2. Retrieval & RRF (top 15)
            candidates = retrieve(search_query, top_k=15, doc_ids=doc_ids)
            
            # Map clean IDs
            for i, c in enumerate(candidates):
                c["display_id"] = f"Source {i+1}"
            
            # Send chunks to frontend to display in Source Panel
            await websocket.send_text(json.dumps({
                "type": "sources",
                "data": candidates
            }))
            
            # 3. Generation (Streaming)
            answer = ""
            for token in generate_answer_stream(search_query, candidates):
                answer += token
                await websocket.send_text(json.dumps({"type": "token", "data": token}))
                
            print(f"RAW LLM STREAMED OUTPUT: '{answer}'")
            
            # Save messages
            msg_id_user = str(uuid.uuid4())
            save_message(msg_id_user, session_id, "user", query)
            
            msg_id_bot = str(uuid.uuid4())
            save_message(msg_id_bot, session_id, "bot", answer)
                
            # 4. Verification
            await websocket.send_text(json.dumps({
                "type": "status",
                "data": "Generating verification..."
            }))
            
            # 4. Verification
            # We calculate a simple confidence score
            verification_result = verify_claims(search_query, answer, candidates)
            
            # Simple heuristic for confidence (0-100)
            # You would normally weight RRF scores + verification here
            confidence_score = 100 if verification_result.get("supported") else 20
            
            if confidence_score >= 60:
                flag = "High Confidence"
            elif confidence_score >= 35:
                flag = "Low Confidence"
            else:
                flag = "Not well supported — verify manually"
                
            # Send final payload
            await websocket.send_text(json.dumps({
                "type": "done",
                "confidence": confidence_score,
                "flag": flag,
                "verification_reasoning": verification_result.get("reasoning", "")
            }))
            
    except WebSocketDisconnect:
        print("Client disconnected")
