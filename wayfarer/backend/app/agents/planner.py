import json
import logging
from app.agents.state import ResearchState
from app.tools.llm_client import call_llm

logger = logging.getLogger("wayfarer.planner")

def planner_node(state: ResearchState) -> ResearchState:
    topic = state["topic"]
    logger.info(f"--- [Node: Planner] Planning research for topic: '{topic}' ---")
    
    prompt = f"""You are the lead Planner for a deep research system.
Given the target research topic: "{topic}"

Please break down this topic into 3 specific sub-questions to investigate, and suggest an optimal initial search query.
Return your response ONLY as valid JSON in the following format:
{{
  "sub_questions": [
    "Sub question 1...",
    "Sub question 2...",
    "Sub question 3..."
  ],
  "initial_search_query": "broad search terms for topic"
}}
"""

    response_text = call_llm(prompt, llm_config=state.get("llm_config"))
    
    sub_questions = []
    initial_search_query = topic
    
    try:
        # Extract JSON block if wrapped in markdown code blocks
        clean_text = response_text
        if "```json" in clean_text:
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_text:
            clean_text = clean_text.split("```")[1].split("```")[0].strip()
            
        parsed = json.loads(clean_text)
        sub_questions = parsed.get("sub_questions", [])
        initial_search_query = parsed.get("initial_search_query", topic)
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
