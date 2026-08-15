import requests
from bs4 import BeautifulSoup
import pandas as pd
import io
import re
import urllib.parse
import logging
from typing import Dict, Any, List

logger = logging.getLogger("wayfarer.scraper")

def scrape_page(url: str, timeout: int = 8) -> Dict[str, Any]:
    """
    Parses webpage content deterministically (Section 5.1):
    - Title & Meta description, Publish date
    - Body text, headings, lists, quotes (blockquotes)
    - HTML Tables (via pandas / BeautifulSoup)
    - Links (anchor text + URL)
    - Equations (raw LaTeX/MathML)
    - Image candidates (up to 5 for image relevance routing)
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
    
    output = {
        "url": url,
        "success": False,
        "title": "",
        "description": "",
        "publish_date": "",
        "text": "",
        "tables": [],
        "links": [],
        "equations": [],
        "image_candidates": [],
        "error": None
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=timeout)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Title
            title_node = soup.find("title")
            output["title"] = title_node.get_text(strip=True) if title_node else url
            
            # Meta Description & Publish Date
            meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
            if meta_desc:
                output["description"] = meta_desc.get("content", "").strip()
                
            meta_date = (
                soup.find("meta", attrs={"name": "publish-date"}) or 
                soup.find("meta", attrs={"property": "article:published_time"}) or 
                soup.find("meta", attrs={"name": "pubdate"})
            )
            if meta_date:
                output["publish_date"] = meta_date.get("content", "").strip()
            
            # Raw Equations (LaTeX/MathML)
            # Find MathML <math> tags
            for math_tag in soup.find_all("math"):
                output["equations"].append(str(math_tag))
            # Find common MathJax/LaTeX formats in text e.g. $$...$$ or \(...\)
            text_content = response.text
            latex_matches = re.findall(r"\$\$.*?\$\$|\$.*?\$|\\\(.*?\\\)|\\\[.*?\\\]", text_content, re.DOTALL)
            for match in latex_matches[:10]: # Cap equations
                output["equations"].append(match.strip())

            # Image candidates for relevance routing (Cap to top 5)
            img_count = 0
            for img in soup.find_all("img"):
                if img_count >= 5:
                    break
                src = img.get("src")
                if not src:
                    continue
                # Fully qualify relative image URLs
                if not src.startswith("http"):
                    src = urllib.parse.urljoin(url, src)
                
                alt = img.get("alt", "").strip()
                img_title = img.get("title", "").strip()
                
                # Context: preceding heading and surrounding paragraph
                heading = ""
                surrounding = ""
                
                # Search upwards/backwards for headers
                prev = img.find_previous(["h1", "h2", "h3", "h4", "h5", "h6"])
                if prev:
                    heading = prev.get_text(strip=True)
                
                # Surrounding text: check sibling or parent paragraphs
                parent_p = img.find_parent("p")
                if parent_p:
                    surrounding = parent_p.get_text(strip=True)
                else:
                    sibling_p = img.find_next_sibling("p") or img.find_previous_sibling("p")
                    if sibling_p:
                        surrounding = sibling_p.get_text(strip=True)
                
                output["image_candidates"].append({
                    "url": src,
                    "alt": alt or img_title,
                    "heading": heading,
                    "context": surrounding[:200]
                })
                img_count += 1

            # Extract lists, quotes, body text, headings
            quotes = [q.get_text(strip=True) for q in soup.find_all(["blockquote", "q"])]
            
            # Remove scripts, styles, nav, footer
            for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                element.decompose()
                
            paragraphs = []
            for tag in soup.find_all(["p", "h1", "h2", "h3", "li"]):
                txt = tag.get_text(strip=True)
                if len(txt) > 20:
                    paragraphs.append(txt)
            
            # Combine quotes at the top or within body
            full_text_list = []
            if quotes:
                full_text_list.append("Quotes found on page:")
                for q in quotes[:5]:
                    full_text_list.append(f'  - "{q}"')
            full_text_list.extend(paragraphs)
            
            output["text"] = "\n".join(full_text_list)[:4000] # Bounded to prevent excessive context size
            
            # Extract tables using pandas
            try:
                tables = pd.read_html(io.StringIO(response.text))
                for idx, df in enumerate(tables[:3]): # Max 3 tables per page
                    if not df.empty and df.shape[0] > 1 and df.shape[1] > 1:
                        # Clean dataframe & convert to markdown table
                        markdown_table = df.head(10).to_markdown(index=False)
                        output["tables"].append(markdown_table)
            except Exception as te:
                logger.debug(f"No tables extracted from {url}: {te}")
                
            # Extract relevant outbound links
            for a in soup.find_all("a", href=True):
                href = a["href"]
                text = a.get_text(strip=True)
                if href.startswith("http") and len(text) > 5:
                    output["links"].append({"url": href, "text": text})
                    if len(output["links"]) >= 5:
                        break
                        
            output["success"] = True
        else:
            output["error"] = f"HTTP status {response.status_code}"
    except Exception as e:
        logger.warning(f"Failed to scrape page {url}: {e}")
        output["error"] = str(e)
        
    return output
