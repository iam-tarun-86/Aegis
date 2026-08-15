# DocMind 🧠

DocMind is an intelligent, completely local AI assistant for document analysis. It utilizes a state-of-the-art Retrieval-Augmented Generation (RAG) pipeline to let you chat with your PDFs, Word documents, and text files entirely offline.

## ✨ Features

- **Hybrid Search Engine:** Combines Dense vector retrieval (ChromaDB) with Sparse keyword retrieval (BM25) using Reciprocal Rank Fusion (RRF) to ensure no context is missed.
- **Smart Document Parsing:** 
  - Utilizes **OpenDataLoader** for highly-structured, vision-based PDF parsing.
  - Automatically falls back to **Unstructured.io** (with Tesseract OCR) for scanned PDFs or other document types (Word, TXT).
- **Beautiful UI:** A premium React frontend powered by Tailwind CSS, featuring:
  - Rich Markdown formatting
  - LaTeX math rendering via KaTeX
  - Code block syntax highlighting
  - Multi-workspace session management
- **100% Local Privacy:** Powered by local LLMs (like Gemma) running via `llama.cpp`—no APIs, no subscriptions, and your files never leave your computer.

## 🏗️ Architecture

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, `react-markdown`.
- **Backend:** Python, FastAPI, SQLite (Metadata), ChromaDB (Vector Store).
- **LLM Engine:** Local `llama.cpp` server (OpenAI API compatible).

## 🚀 Getting Started

### Prerequisites
1. **Node.js** (for the frontend)
2. **Python 3.8+** (for the backend)
3. **Java 11+** (required for the OpenDataLoader PDF parser)
4. A running instance of `llama.cpp` on port `8085`.

### Installation

1. **Backend Setup:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   ```

### Running the App

You can start the entire stack instantly using the provided startup script:
```bash
./start.sh
```

This will boot:
- The FastAPI Backend on `http://localhost:8000`
- The React Frontend UI on `http://localhost:5173`

Navigate to `http://localhost:5173` in your browser, upload a document, and start chatting!

---
*DocMind — Because your documents shouldn't be a black box.* 🕵️‍♂️✨
