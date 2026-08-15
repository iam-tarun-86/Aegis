import logging
from typing import Dict, Any
import urllib.parse
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re

logger = logging.getLogger("wayfarer.scraper")

def scrape_page(url: str, timeout: int = 15) -> Dict[str, Any]:
    """
    Parses webpage content using Turbo Mode Playwright (blocking heavy assets).
    """
    output = {
        "url": url, "success": False, "title": "", "description": "",
        "publish_date": "", "text": "", "tables": [], "links": [],
        "equations": [], "image_candidates": [], "error": None
    }
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            
            # Turbo Mode: Abort images, media, fonts, stylesheets
            def block_resources(route):
                if route.request.resource_type in ["image", "media", "font", "stylesheet"]:
                    route.abort()
                else:
                    route.continue_()
            
            page = context.new_page()
            page.route("**/*", block_resources)
            
            page.goto(url, timeout=timeout*1000, wait_until="domcontentloaded")
            html = page.content()
            browser.close()
            
            soup = BeautifulSoup(html, "html.parser")
            
            # Title
            title_node = soup.find("title")
            output["title"] = title_node.get_text(strip=True) if title_node else url
            
            # Text extraction
            for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                element.decompose()
                
            paragraphs = []
            for tag in soup.find_all(["p", "h1", "h2", "h3", "li"]):
                txt = tag.get_text(strip=True)
                if len(txt) > 20:
                    paragraphs.append(txt)
                    
            output["text"] = "\n".join(paragraphs)[:8000]
            output["success"] = True

    except Exception as e:
        logger.warning(f"Failed to scrape page {url}: {e}")
        output["error"] = str(e)
        
    return output
