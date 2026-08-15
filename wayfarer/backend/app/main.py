import json
import asyncio
import logging
import requests
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.agents.graph import research_graph
from app.config import settings
from app.tools import nvidia_catalog
from app.tools.llm_client import call_llm
from app.tools.report_format import normalize_report

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("wayfarer.main")

app = FastAPI(title="Wayfarer API", description="Local-First Multi-Agent Deep Research System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Wayfarer Deep Research"}

@app.get("/api/llm-status")
def get_llm_status():
    """Checks if the local llama-server is online on port 8085."""
    try:
        response = requests.get(f"{settings.LLAMA_SERVER_URL}/models", timeout=1.0)
        if response.status_code == 200:
            return {"online": True}
    except Exception:
        pass
    return {"online": False}

from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str
    llm_config: Optional[dict] = None

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    """Simple chat endpoint to verify model availability/connectivity."""
    try:
        response = call_llm(
            prompt=req.message,
            system_prompt="You are a helpful AI assistant verifying connection availability. Answer the user's prompt briefly.",
            llm_config=req.llm_config
        )
        return {"response": response}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/nvidia-models")
def get_nvidia_models(api_key: Optional[str] = None):
    """Lists models available on the NVIDIA NIM catalogue.

    Note: this endpoint is PUBLIC — it answers 200 with the full catalogue even
    with no key at all. A successful listing therefore says nothing about whether
    the user's key works; use /api/verify-nvidia-key for that.
    """
    key = (api_key or settings.NVIDIA_API_KEY or "").strip()
    url = f"{settings.NVIDIA_BASE_URL.rstrip('/')}/models"
    headers = {"Authorization": f"Bearer {key}"} if key else {}
    try:
        response = requests.get(url, headers=headers, timeout=10.0)
        if response.status_code != 200:
            return {"error": f"NVIDIA API returned HTTP {response.status_code}", "models": []}
    except Exception as e:
        return {"error": f"Failed to connect to NVIDIA API: {str(e)}", "models": []}

    models = sorted(m["id"] for m in response.json().get("data", []) if "id" in m)

    # Split by measured availability — most of this catalogue 404s on inference.
    buckets = {"verified": [], "unverified": [], "unavailable": [], "non-chat": []}
    for model_id in models:
        buckets[nvidia_catalog.classify(model_id)].append(model_id)

    return {
        "models": models,
        "verified": buckets["verified"],
        "unverified": buckets["unverified"],
        "unavailable": buckets["unavailable"],
        "non_chat": buckets["non-chat"],
        "reasoning": sorted(nvidia_catalog.REASONING_MODELS & set(models)),
        "default": nvidia_catalog.DEFAULT_MODEL,
    }


@app.get("/api/verify-nvidia-key")
def verify_nvidia_key(api_key: Optional[str] = None, model: str = "meta/llama-3.1-8b-instruct"):
    """Actually exercises the key with a 1-token completion.

    This is the only reliable check: listing models needs no auth, so the UI
    could otherwise show a populated dropdown while every research call 403s.
    """
    key = (api_key or settings.NVIDIA_API_KEY or "").strip()
    if not key:
        return {
            "valid": False,
            "source": None,
            "error": "No API key. Add NVIDIA_API_KEY to backend/.env or paste one above."
        }

    source = "panel" if api_key else "env"
    try:
        response = requests.post(
            f"{settings.NVIDIA_BASE_URL.rstrip('/')}/chat/completions",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 1,
                "temperature": 0
            },
            timeout=30.0
        )
    except Exception as e:
        return {"valid": False, "source": source, "error": f"Could not reach NVIDIA: {e}"}

    if response.status_code == 200:
        return {"valid": True, "source": source}
    if response.status_code in (401, 403):
        return {"valid": False, "source": source, "error": "NVIDIA rejected this key (HTTP %d)." % response.status_code}
    if response.status_code == 429:
        return {"valid": True, "source": source, "warning": "Key works but is currently rate-limited (HTTP 429)."}
    if response.status_code == 503:
        return {"valid": True, "source": source, "warning": "Key works but the endpoint is saturated (HTTP 503)."}
    return {"valid": False, "source": source, "error": f"HTTP {response.status_code}: {response.text[:200]}"}

@app.websocket("/ws/research")
async def websocket_research(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected")
    
    try:
        data_text = await websocket.receive_text()
        req = json.loads(data_text)
        topic = req.get("topic", "").strip()
        max_rounds = int(req.get("max_rounds", settings.DEFAULT_MAX_ROUNDS))
        llm_config = req.get("llm_config") # Optional provider, model, api_key dict
        
        if not topic:
            await websocket.send_json({"type": "error", "message": "Research topic cannot be empty."})
            await websocket.close()
            return

        await websocket.send_json({
            "type": "status",
            "message": f"Starting research run for topic: '{topic}' (Max Rounds: {max_rounds})"
        })

        initial_state = {
            "topic": topic,
            "max_rounds": max_rounds,
            "current_round": 1,
            "visited_urls": set(),
            "sub_questions": [],
            "current_search_query": topic,
            "sources": [],
            "critic_notes": "",
            "sufficient_coverage": False,
            "logs": [],
            "network_activity": [],
            "final_report": "",
            "llm_config": llm_config
        }

        # Stream LangGraph execution node by node
        current_state = initial_state
        async for event in research_graph.astream(initial_state):
            for node_name, node_output in event.items():
                current_state = {**current_state, **node_output}
                
                # Convert set to list for JSON serialization
                serializable_state = {
                    **current_state,
                    "visited_urls": list(current_state.get("visited_urls", []))
                }
                
                await websocket.send_json({
                    "type": "state_update",
                    "node": node_name,
                    "state": serializable_state
                })
                # Yield execution to allow message transmission
                await asyncio.sleep(0.1)

        await websocket.send_json({
            "type": "complete",
            "final_report": current_state.get("final_report", ""),
            "sources": current_state.get("sources", [])
        })

        # Keep connection open for section-level re-runs
        while True:
            msg_text = await websocket.receive_text()
            msg = json.loads(msg_text)
            if msg.get("type") == "section_rerun":
                section = msg.get("section")
                feedback = msg.get("feedback")
                logger.info(f"Received section rerun request for '{section}' with feedback: '{feedback}'")
                
                await websocket.send_json({
                    "type": "status",
                    "message": f"Regenerating section: '{section}'..."
                })
                
                sources_context = ""
                for s in current_state.get("sources", []):
                    if s["status"] == "Available":
                        sources_context += f"[Source {s['id']}] Title: {s['title']}\nURL: {s['url']}\nSummary: {s['summary']}\n"
                
                rerun_prompt = f"""You are the lead Technical Writer for the Wayfarer deep research system.
The user wants to re-run and modify a specific section of the research report.

Topic: "{current_state.get('topic')}"
Section to modify: "{section}"
User Feedback / Guidance: "{feedback}"

Here is the current full report:
\"\"\"
{current_state.get('final_report')}
\"\"\"

Here are the verified research sources available to you:
\"\"\"
{sources_context}
\"\"\"

Please rewrite/update ONLY the section "{section}" in the report based on the feedback and verified sources. Maintain correct citations (e.g. `[Source X (Confidence: ...)]`). Return the ENTIRE updated Markdown report (with the updated section integrated).
"""
                updated_report = normalize_report(
                    call_llm(rerun_prompt, temperature=0.3,
                             llm_config=current_state.get("llm_config"), max_tokens=8000)
                )
                current_state["final_report"] = updated_report
                
                await websocket.send_json({
                    "type": "complete",
                    "final_report": updated_report,
                    "sources": current_state.get("sources", [])
                })

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"Error during research execution: {e}", exc_info=True)
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

from app.db import init_db, save_search, get_searches, delete_search, clear_searches

@app.on_event("startup")
def startup_event():
    init_db()
    logger.info("Database initialized.")

class SearchSaveReq(BaseModel):
    topic: str
    rounds: int
    report: str
    sources: list

@app.post("/api/history")
def api_save_history(req: SearchSaveReq):
    save_search(req.topic, req.rounds, req.report, req.sources)
    return {"status": "success"}

@app.get("/api/history")
def api_get_history():
    return get_searches()

@app.delete("/api/history/{search_id}")
def api_delete_history(search_id: int):
    delete_search(search_id)
    return {"status": "success"}

@app.delete("/api/history")
def api_clear_history():
    clear_searches()
    return {"status": "success"}

