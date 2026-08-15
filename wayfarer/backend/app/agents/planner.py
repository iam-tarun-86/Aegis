import logging
from typing import List
from pydantic import BaseModel, Field
from app.agents.state import ResearchState
from app.tools.llm_client import call_llm_json

logger = logging.getLogger("wayfarer.planner")

class PlannerOutput(BaseModel):
    sub_questions: List[str] = Field(description="3 specific sub-questions to investigate")
    initial_search_query: str = Field(description="broad search terms for topic")

def planner_node(state: ResearchState) -> ResearchState:
    topic = state["topic"]
    logger.info(f"--- [Node: Planner] Planning research for topic: '{topic}' ---")
    
    prompt = f"""You are the lead Planner for a deep research system.
Given the target research topic: "{topic}"

Please break down this topic into 3 specific sub-questions to investigate, and suggest an optimal initial search query.
"""

    try:
        parsed = call_llm_json(
            prompt=prompt,
            response_model=PlannerOutput,
            llm_config=state.get("llm_config")
        )
        sub_questions = parsed.sub_questions
        initial_search_query = parsed.initial_search_query
    except Exception as e:
        logger.warning(f"Failed to parse Planner JSON response: {e}. Using fallback sub-questions.")
        sub_questions = [
            f"Core concepts and principles of {topic}",
            f"Recent innovations and breakthroughs in {topic}",
            f"Key technical challenges and future outlook for {topic}"
        ]
        initial_search_query = topic

    log_entry = {
        "node": "Planner",
        "action": "Generated Plan",
        "details": f"Sub-questions: {len(sub_questions)} | Query: '{initial_search_query}'",
        "sub_questions": sub_questions
    }
    
    new_logs = list(state.get("logs", []))
    new_logs.append(log_entry)

    return {
        **state,
        "current_round": 1,
        "sub_questions": sub_questions,
        "current_search_query": initial_search_query,
        "logs": new_logs
    }
