import logging
from app.agents.state import ResearchState
from app.tools.llm_client import call_llm
from app.tools.report_format import normalize_report, citation_stats

logger = logging.getLogger("wayfarer.writer")

def writer_node(state: ResearchState) -> ResearchState:
    topic = state["topic"]
    sub_questions = state.get("sub_questions", [])
    sources = state.get("sources", [])
    logs = list(state.get("logs", []))
    
    logger.info(f"--- [Node: Writer] Compiling final research report for topic: '{topic}' ---")
    
    # Format source context with clear IDs, URLs, tables, equations and relevant image descriptions
    sources_context = ""
    for s in sources:
        if s["status"] == "Available":
            sources_context += f"\n[Source {s['id']}] Title: {s['title']}\nURL: {s['url']}\nSummary: {s['summary']}\n"
            if s.get("tables"):
                sources_context += "Extracted Table:\n" + "\n".join(s["tables"]) + "\n"
            if s.get("equations"):
                sources_context += "Extracted Math/Equations:\n" + "\n".join(s["equations"]) + "\n"
            if s.get("relevant_images"):
                sources_context += "Relevant Image Descriptions:\n"
                for img in s["relevant_images"]:
                    sources_context += f"  - Image URL: {img['url']}\n    Description: {img['description']}\n"
        else:
            sources_context += f"\n[Source {s['id']}] (UNAVAILABLE/BLOCKED) URL: {s['url']}\n"

    sub_question_lines = "\n".join(f"- {q}" for q in sub_questions) or "- (none recorded)"

    # The contract is stated up front, concretely, and with a worked example.
    # Smaller local models follow a short explicit spec far more reliably than
    # a long prose brief, and the example is what actually pins the citation
    # format down — describing it in words alone was not enough.
    prompt = f"""You are the lead Technical Writer for the Wayfarer deep research system.

Topic: "{topic}"

Sub-questions to answer:
{sub_question_lines}

Verified research evidence:
{sources_context[:6000]}

=== OUTPUT CONTRACT (follow exactly) ===
1. Your very first character must be `#`. Write NO preamble, no restatement of
   these instructions, no notes about your process or reasoning. Start the
   report immediately.
2. Required sections, in this order and with these exact headings:
   `# <a specific, descriptive title>`
   `## Executive Summary`
   `## Key Findings & Core Themes`
   `## Technical Mechanisms & Architectural Details`
   `## Challenges, Tradeoffs & Future Outlook`
   `## Verified Sources & References`
3. Every factual claim ends with a citation in EXACTLY this form:
       [Source 2 (Confidence: High)]
   Correct:   Q4_K_M cuts VRAM by roughly 70% [Source 2 (Confidence: High)].
   Incorrect: [Source 2, High]  /  [Source 2]  /  【Source 2】  /  (Source 2)
   Choose the level honestly:
   - High   - corroborated by two or more of the sources above.
   - Medium - stated by exactly one source, nothing contradicts it.
   - Low    - inferred, speculative, or the source looks unreliable.
4. Never cite a source id that does not appear in the evidence above, and never
   invent figures, dates or quotations that are not present there. If the
   evidence does not cover a sub-question, say so plainly under a
   `### Gaps in Coverage` subheading instead of filling it in from memory.
5. Depth: 1500-2500 words. Write developed multi-sentence paragraphs, not
   bullet fragments. Include at least one comparison Markdown table contrasting
   options, metrics or tradeoffs. Use fenced code blocks for commands or
   config, and LaTeX for equations where relevant.
6. `## Verified Sources & References` lists each source as:
   `- [Source X] <title> - <url> - Overall confidence: High/Medium/Low`
   Mark any unavailable/blocked source explicitly and note what it cost you.

Write the report now, beginning with `#`."""

    # Reasoning models (stepfun, gpt-oss, nemotron-3...) spend completion budget
    # thinking before emitting a word, so a 4k cap can truncate the report to
    # nothing. Ask for more; llm_client backs off if the deployment refuses.
    final_report = call_llm(
        prompt,
        temperature=0.2,
        llm_config=state.get("llm_config"),
        max_tokens=8000
    )

    # Models disagree on the citation form even when shown an example, so the
    # report is conformed here rather than trusting every model to comply.
    final_report = normalize_report(final_report)
    stats = citation_stats(final_report)

    logs.append({
        "node": "Writer",
        "action": "Generated Final Report",
        "report_length": len(final_report),
        "citations": stats["canonical"],
        "citations_unscored": stats["non_canonical"]
    })

    return {
        **state,
        "final_report": final_report,
        "logs": logs
    }
