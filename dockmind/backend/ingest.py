import os
import uuid
import re
from db import save_chunk, save_document

def chunk_markdown(text: str, max_chunk_size: int = 1500) -> list:
    """Splits markdown by headings to create natural sections.
    If a section exceeds max_chunk_size, it splits it further by paragraphs.
    """
    sections = re.split(r'(?m)(?=#+\s)', text)
    chunks = []
    
    for section in sections:
        section = section.strip()
        if not section: continue
        
        # Determine section title (first heading) or default
        title_match = re.search(r'^#+\s+(.*)$', section, flags=re.MULTILINE)
        section_title = title_match.group(1).strip() if title_match else "General Content"
        
        if len(section) > max_chunk_size:
            # Fall back to semantic paragraph splitting
            paragraphs = re.split(r'\n\s*\n', section)
            current_chunk = ""
            for p in paragraphs:
                p = p.strip()
                if not p: continue
                if len(current_chunk) + len(p) + 2 > max_chunk_size and current_chunk:
                    chunks.append((current_chunk, section_title))
                    current_chunk = p
                else:
                    current_chunk += ("\n\n" + p) if current_chunk else p
            if current_chunk:
                chunks.append((current_chunk, section_title))
        else:
            chunks.append((section, section_title))
        
    return chunks

def extract_with_docling(filepath: str) -> str:
    """Uses Docling to reliably parse complex PDFs and documents into clean Markdown."""
    from docling.document_converter import DocumentConverter
    converter = DocumentConverter()
    result = converter.convert(filepath)
    return result.document.export_to_markdown()

def process_document(filepath: str, doc_id: str = None, session_id: str = None, original_filename: str = None) -> int:
    """
    Routes the file to Docling.
    Splits the parsed markdown and saves chunks.
    """
    if not doc_id:
        doc_id = str(uuid.uuid4())
        
    filename = original_filename if original_filename else os.path.basename(filepath)
    save_document(doc_id=doc_id, session_id=session_id, filename=filename)
    
    print(f"Processing document with Docling: {filepath}")
    
    try:
        if filepath.endswith('.md') or filepath.endswith('.txt'):
            with open(filepath, 'r', encoding='utf-8') as f:
                md_text = f.read()
        else:
            md_text = extract_with_docling(filepath)
    except Exception as e:
        print(f"Failed to parse {filepath} with Docling: {e}")
        return 0
            
    final_chunks = chunk_markdown(md_text, max_chunk_size=1500)
            
    print(f"Indexing {len(final_chunks)} chunks...")
    chunks_saved = 0
    for i, (text, section_title) in enumerate(final_chunks):
        if not text.strip(): continue
        chunk_id = f"{doc_id}_chunk_{i}"
        save_chunk(
            chunk_id=chunk_id,
            text=text.strip(),
            page_num=1,
            section_title=section_title[:100],  # Limit title length
            doc_id=doc_id,
            filename=filename,
            session_id=session_id
        )
        chunks_saved += 1
        
    print("Done processing.")
    return chunks_saved

def ingest_document(filepath: str, session_id: str, doc_id: str = None, original_filename: str = None) -> int:
    return process_document(filepath, doc_id=doc_id, session_id=session_id, original_filename=original_filename)
