import logging
import json
import urllib.parse
from app.agents.state import ResearchState
from app.tools.search import search_duckduckgo
from app.tools.scraper import scrape_page
from app.tools.llm_client import call_llm
from app.config import settings

logger = logging.getLogger("wayfarer.researcher")

def researcher_node(state: ResearchState) -> ResearchState:
    query = state["current_search_query"]
    current_round = state["current_round"]
    visited_urls = set(state.get("visited_urls", set()))
    sources = list(state.get("sources", []))
    logs = list(state.get("logs", []))
    network_activity = list(state.get("network_activity", []))
    
    logger.info(f"--- [Node: Researcher | Round {current_round}] Searching: '{query}' ---")
    
    # 1. Execute Search
    network_activity.append({
        "type": "search",
        "target": f"DuckDuckGo Query: {query}",
        "status": "Success",
        "size": "N/A"
    })
    
    search_results = search_duckduckgo(query, max_results=5)
    
    logs.append({
        "node": "Researcher",
        "action": f"Round {current_round} Search",
        "query": query,
        "results_found": len(search_results)
    })
    
    scraped_count = 0
    for item in search_results:
        href = item["href"]
        title = item["title"]
        snippet = item["snippet"]
        
        # Rule: No duplicate visits across rounds
        if href in visited_urls:
            logger.info(f"Skipping already visited URL: {href}")
            continue
            
        visited_urls.add(href)
        
        if scraped_count >= settings.MAX_SCRAPED_PAGES_PER_ROUND:
            break
            
        logger.info(f"Scraping page [{scraped_count + 1}]: {href}")
        
        # Safe execution wrapper per Section 6
        try:
            scraped_data = scrape_page(href)
            scraped_count += 1
            
            if scraped_data["success"] and scraped_data["text"]:
                network_activity.append({
                    "type": "scrape",
                    "target": href,
                    "status": "Success",
                    "size": f"{len(scraped_data['text'])} chars"
                })
                
                # Image Relevance Routing (Section 5.3)
                candidates = scraped_data.get("image_candidates", [])
                relevant_images = []
                if candidates:
                    candidates_summary = ""
                    for idx, c in enumerate(candidates):
                        candidates_summary += f"Candidate [{idx}]:\nURL: {c['url']}\nAlt: {c['alt']}\nHeading: {c['heading']}\nContext: {c['context']}\n\n"
                    
                    routing_prompt = f"""You are analyzing image candidates for the research topic: "{state['topic']}".
We only want to analyze images that are highly relevant to answering the research topic (e.g., architecture diagrams, data graphs, or process charts). Skip ads, brand logos, icons, navigation graphics, and generic decorative banners.

Candidates:
{candidates_summary}

Determine which images are relevant. Return your response ONLY as a valid JSON object with the URL list:
{{
  "analyze_urls": ["url_of_relevant_image_1", "url_of_relevant_image_2"]
}}
"""
                    urls_to_analyze = []
                    try:
                        routing_response = call_llm(routing_prompt, temperature=0.1, llm_config=state.get("llm_config"))
                        clean_routing = routing_response
                        if "```json" in clean_routing:
                            clean_routing = clean_routing.split("```json")[1].split("```")[0].strip()
                        elif "```" in clean_routing:
                            clean_routing = clean_routing.split("```")[1].split("```")[0].strip()
                        
                        parsed_routing = json.loads(clean_routing)
                        urls_to_analyze = parsed_routing.get("analyze_urls", [])
                    except Exception as re_err:
                        logger.warning(f"Malformed image routing tool-call output: {re_err}. Skipping image vision checks.")
                        urls_to_analyze = []
                    
                    for c in candidates:
                        if c["url"] in urls_to_analyze:
                            # Invoke simulated native vision or image analysis
                            vision_prompt = f"Analyze the following image in the context of research on '{state['topic']}':\nURL: {c['url']}\nAlt Text: {c['alt']}\nHeading Context: {c['heading']}"
                            img_description = call_llm(vision_prompt, system_prompt="You are a multimodal AI. Describe the diagrams, text inside, and overall layout of the image.", temperature=0.2, llm_config=state.get("llm_config"))
                            
                            relevant_images.append({
                                "url": c["url"],
                                "alt": c["alt"],
                                "description": img_description
                            })
                            network_activity.append({
                                "type": "vision_analysis",
                                "target": c["url"],
                                "status": "Success",
                                "size": "N/A"
                            })

                # Rule: Immediately summarize scraped text to keep graph state compact & prevent context bloat
                summary_prompt = f"""Summarize the key factual findings from this source relevant to the research topic "{state['topic']}".
Source Title: {scraped_data['title']}
Content Snippet:
{scraped_data['text'][:2000]}

Provide 3-5 bullet points of dense factual information, including any stats, metrics, or technical mechanisms.
"""
                summary = call_llm(summary_prompt, temperature=0.1, llm_config=state.get("llm_config"))
                
                source_entry = {
                    "id": len(sources) + 1,
                    "round": current_round,
                    "title": scraped_data["title"],
                    "url": href,
                    "snippet": snippet,
                    "summary": summary,
                    "tables": scraped_data["tables"],
                    "equations": scraped_data.get("equations", []),
                    "relevant_images": relevant_images,
                    "status": "Available"
                }
                sources.append(source_entry)
                
                logs.append({
                    "node": "Researcher",
                    "action": "Scraped & Summarized Source",
                    "source_id": source_entry["id"],
                    "title": scraped_data["title"],
                    "url": href,
                    "tables_extracted": len(scraped_data["tables"]),
                    "equations_extracted": len(scraped_data.get("equations", [])),
                    "images_analyzed": len(relevant_images)
                })
            else:
                raise ValueError(scraped_data.get("error", "No text content returned"))
                
        except Exception as e:
            logger.error(f"Failed to scrape {href}: {e}")
            network_activity.append({
                "type": "scrape",
                "target": href,
                "status": "Failed",
                "size": "N/A"
            })
            
            # Failure handling per Section 6: fail visibly
            sources.append({
                "id": len(sources) + 1,
                "round": current_round,
                "title": title,
                "url": href,
                "snippet": snippet,
                "summary": f"Source page un-scrapeable or blocked: {e}",
                "tables": [],
                "equations": [],
                "relevant_images": [],
                "status": "Unavailable"
            })
            
            logs.append({
                "node": "Researcher",
                "action": "Source Scraping Failed (Marked Unavailable)",
                "url": href,
                "error": str(e)
            })

    return {
        **state,
        "visited_urls": visited_urls,
        "sources": sources,
        "logs": logs,
        "network_activity": network_activity
    }
