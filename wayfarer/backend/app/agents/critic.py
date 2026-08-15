import json
import logging
from app.agents.state import ResearchState
from app.tools.llm_client import call_llm

logger = logging.getLogger("wayfarer.critic")

def critic_node(state: ResearchState) -> ResearchState:
    topic = state["topic"]
    current_round = state["current_round"]
    max_rounds = state["max_rounds"]
    sub_questions = state.get("sub_questions", [])
    sources = state.get("sources", [])
    logs = list(state.get("logs", []))
    
    logger.info(f"--- [Node: Critic | Round {current_round}] Evaluating coverage & gaps ---")
    
    # Compile list of active summaries
    available_summaries = [f"Source [{s['id']}] ({s['title']}): {s['summary']}" for s in sources if s["status"] == "Available"]
    summaries_text = "\n".join(available_summaries)
    
    prompt = f"""You are the Critic node in a deep research graph.
Topic: "{topic}"
Sub-questions to satisfy:
{json.dumps(sub_questions, indent=2)}

Accumulated Source Summaries ({len(available_summaries)} sources):
{summaries_text[:4000]}

Evaluate the accumulated findings based on these three criteria:
1. Coverage: Does the accumulated content answer every sub-question identified?
2. Consistency: Do sources agree or conflict on key facts? Identify any conflicts.
3. Staleness: Is any source's information outdated relative to the topic?

Return your response ONLY as valid JSON in this structure:
{{
  "sufficient_coverage": true or false,
  "reasoning": "Detailed evaluation addressing the three criteria (Coverage, Consistency, Staleness) and remaining gaps...",
  "next_query": "Targeted search query for missing information or resolving conflicts (if sufficient_coverage is false)"
}}
"""

    response_text = call_llm(prompt, temperature=0.1, llm_config=state.get("llm_config"))
    
    sufficient_coverage = False
    reasoning = "Evaluating round results."
    next_query = f"{topic} detailed analysis"
    
    try:
        clean_text = response_text
        if "```json" in clean_text:
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_text:
            clean_text = clean_text.split("```")[1].split("```")[0].strip()
            
        parsed = json.loads(clean_text)
        sufficient_coverage = parsed.get("sufficient_coverage", False)
        reasoning = parsed.get("reasoning", "Analyzed round coverage.")
        next_query = parsed.get("next_query", f"{topic} follow-up")
    except Exception as e:
        logger.warning(f"Failed to parse Critic JSON response: {e}")
        # Rule: Max round check acts as absolute ceiling
        if current_round >= max_rounds:
            sufficient_coverage = True
            reasoning = "Max recommended research rounds reached."

    # Early exit rule: if max_rounds reached, force sufficient_coverage = True
    if current_round >= max_rounds:
        sufficient_coverage = True
        reasoning += f" (Reached maximum round limit of {max_rounds})"

    log_entry = {
        "node": "Critic",
        "action": f"Round {current_round} Critique",
        "sufficient_coverage": sufficient_coverage,
        "reasoning": reasoning,
        "next_query": next_query if not sufficient_coverage else None
    }
    logs.append(log_entry)
    
    next_round = current_round + 1 if not sufficient_coverage else current_round

    return {
        **state,
        "current_round": next_round,
        "sufficient_coverage": sufficient_coverage,
        "critic_notes": reasoning,
        "current_search_query": next_query,
        "logs": logs
    }
