from langgraph.graph import StateGraph, END
from app.agents.state import ResearchState
from app.agents.planner import planner_node
from app.agents.researcher import researcher_node
from app.agents.critic import critic_node
from app.agents.writer import writer_node

def route_after_critic(state: ResearchState) -> str:
    """Conditional edge router checking early exit or max rounds."""
    if state.get("sufficient_coverage", False):
        return "writer"
    return "researcher"

def create_research_graph():
    builder = StateGraph(ResearchState)

    # Add Nodes
    builder.add_node("planner", planner_node)
    builder.add_node("researcher", researcher_node)
    builder.add_node("critic", critic_node)
    builder.add_node("writer", writer_node)

    # Add Edges
    builder.set_entry_point("planner")
    builder.add_edge("planner", "researcher")
    builder.add_edge("researcher", "critic")
    
    # Conditional edge from critic
    builder.add_conditional_edges(
        "critic",
        route_after_critic,
        {
            "writer": "writer",
            "researcher": "researcher"
        }
    )
    
    builder.add_edge("writer", END)

    return builder.compile()

research_graph = create_research_graph()
