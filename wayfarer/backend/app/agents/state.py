from typing import TypedDict, List, Set, Dict, Any, Optional

class ResearchState(TypedDict):
    topic: str
    max_rounds: int
    current_round: int
    visited_urls: Set[str]
    sub_questions: List[str]
    current_search_query: str
    sources: List[Dict[str, Any]]
    critic_notes: str
    sufficient_coverage: bool
    logs: List[Dict[str, Any]]
    network_activity: List[Dict[str, Any]]
    final_report: str
    llm_config: Optional[Dict[str, Any]]
