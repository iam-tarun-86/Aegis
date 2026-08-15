import fitz  # PyMuPDF
import os
import uuid
import re
import docx
from PIL import Image
import pytesseract
from db import save_chunk, save_document

from unstructured.partition.auto import partition
from unstructured.documents.elements import Header, Footer, Table, Title

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list:
    """Basic character-level chunking with overlap."""
    if not text:
        return []
        
    chunks = []
    for i in range(0, len(text), chunk_size - overlap):
        chunk = text[i:i + chunk_size]
        if chunk:
            chunks.append(chunk)
    return chunks

def chunk_markdown(text: str) -> list:
    """Splits markdown by headings to create natural sections."""
    import re
    sections = re.split(r'(?m)(?=#+\s)', text)
    chunks = []
    for section in sections:
        if not section.strip(): continue
        # If a section is still too large, we fall back to standard chunking
        if len(section) > 2000:
            chunks.extend(chunk_text(section))
        else:
            chunks.append(section.strip())
        
    return chunks

def extract_pdf_opendataloader(filepath: str) -> str:
    import opendataloader_pdf
    import tempfile
    import os
    
    with tempfile.TemporaryDirectory() as temp_dir:
        opendataloader_pdf.convert(
            input_path=filepath,
            output_dir=temp_dir,
            format="markdown"
        )
        
        # Find the generated markdown file
        for file in os.listdir(temp_dir):
            if file.endswith(".md"):
                with open(os.path.join(temp_dir, file), "r", encoding="utf-8") as f:
                    return f.read()
    return ""

def process_document(filepath: str, doc_id: str = None, session_id: str = None, original_filename: str = None) -> int:
    """
    Routes the file to OpenDataLoader (for PDFs) or Unstructured (for others).
    Splits the parsed elements/text and saves chunks.
    """
    if not doc_id:
        doc_id = str(uuid.uuid4())
        
    filename = original_filename if original_filename else os.path.basename(filepath)
    save_document(doc_id=doc_id, session_id=session_id, filename=filename)
    
    chunks = []
    current_title = "Default Section"
    
    ext = os.path.splitext(filepath)[1].lower()
    use_unstructured = True
    
    if ext == '.pdf':
        print(f"Processing PDF with OpenDataLoader: {filepath}")
        try:
            md_text = extract_pdf_opendataloader(filepath)
            
            # Smart Route Check: If the text is mostly just image tags, it's a scanned PDF
            import re
            text_without_images = re.sub(r'!\[.*?\]\(.*?\)', '', md_text).strip()
            if len(text_without_images) < 50:
                print("OpenDataLoader found insufficient text (likely scanned). Falling back to Unstructured.")
                use_unstructured = True
            else:
                md_chunks = chunk_markdown(md_text)
                for c in md_chunks:
                    chunks.append((c, current_title))
                use_unstructured = False
        except Exception as e:
            print(f"Failed to parse {filepath} with OpenDataLoader: {e}. Falling back to Unstructured.")
            use_unstructured = True
            
    if use_unstructured:
        print(f"Processing document with Unstructured: {filepath}")
        try:
            elements = partition(filename=filepath, strategy="hi_res")
        except Exception as e:
            print(f"Failed to parse {filepath} with Unstructured: {e}")
            return 0
            
        current_chunk = ""
        
        for element in elements:
            if isinstance(element, (Header, Footer)):
                continue
                
            if isinstance(element, Title):
                if current_chunk.strip():
                    chunks.append((current_chunk.strip(), current_title))
                    current_chunk = ""
                current_title = element.text
                current_chunk += f"\n# {element.text}\n"
            elif isinstance(element, Table):
                table_text = element.metadata.text_as_html if hasattr(element.metadata, 'text_as_html') and element.metadata.text_as_html else element.text
                if current_chunk.strip():
                    chunks.append((current_chunk.strip(), current_title))
                chunks.append((table_text, current_title))
                current_chunk = ""
            else:
                current_chunk += element.text + "\n"
                
        if current_chunk.strip():
            chunks.append((current_chunk.strip(), current_title))
        
    final_chunks = []
    for chunk_text_content, chunk_title in chunks:
        if len(chunk_text_content) > 2000:
            split_chunks = chunk_text(chunk_text_content)
            for split_chunk in split_chunks:
                final_chunks.append((split_chunk, chunk_title))
        else:
            final_chunks.append((chunk_text_content, chunk_title))
            
    print(f"Indexing {len(final_chunks)} chunks...")
    chunks_saved = 0
    for i, (text, section_title) in enumerate(final_chunks):
        if not text.strip(): continue
        chunk_id = f"{doc_id}_chunk_{i}"
        save_chunk(
            chunk_id=chunk_id,
            text=text.strip(),
            page_num=1,
            section_title=section_title,
            doc_id=doc_id,
            filename=filename,
            session_id=session_id
        )
        chunks_saved += 1
        
    print("Done processing.")
    return chunks_saved

def ingest_document(filepath: str, session_id: str, doc_id: str = None, original_filename: str = None) -> int:
    return process_document(filepath, doc_id=doc_id, session_id=session_id, original_filename=original_filename)
