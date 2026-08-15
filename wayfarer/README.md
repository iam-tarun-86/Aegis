# 🌌 Wayfarer: Local-First Deep Research System

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/iam-tarun-86/wayfarer)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Framework](https://img.shields.io/badge/Orchestration-LangGraph-orange.svg)](https://github.com/langchain-ai/langgraph)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React_18_%7C_Vite-61dafb.svg)](https://vitejs.dev/)
[![Visualizer](https://img.shields.io/badge/Visualizer-Three.js-black.svg)](https://threejs.org/)

> ⚡ **Unshackle your research. Zero API bills. Zero data leaks. Infinite discovery.**  
> *"Why stream your queries to distant clouds when your local GPU can command an autonomous space-station of agents? Give Wayfarer a prompt, sit back, and watch probe rockets harvest the digital void to synthesize publication-grade whitepapers—100% on-device."*

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Multi-Agent Architecture](#-multi-agent-architecture)
- [3D Space Visualizer ("The Void")](#-3d-space-visualizer-the-void)
- [Technology Stack](#-technology-stack)
- [Quickstart Guide](#-quickstart-guide)
  - [Option 1: One-Click Startup Script (Linux / WSL 2)](#option-1-one-click-startup-script-linux--wsl-2)
  - [Option 2: Native Windows Installation](#option-2-native-windows-installation)
  - [Option 3: Manual Installation](#option-3-manual-installation)
- [LLM Provider Configuration](#-llm-provider-configuration)
- [API & WebSocket Protocol](#-api--websocket-protocol)
- [Project Directory Structure](#-project-directory-structure)
- [License & Acknowledgments](#-license--acknowledgments)

---

## 🌌 Overview

**Wayfarer** is an open-source, local-first deep research platform designed to automate multi-step web investigation, information parsing, critical gap analysis, and academic-grade report synthesis. 

Unlike simple search wrappers, Wayfarer deploys a **LangGraph-powered stateful agent loop** that breaks broad user prompts into targeted sub-questions, queries live web indexes (DuckDuckGo), scrapes raw HTML, extracts tables and LaTeX math expressions, routes image candidates through vision pipelines, and self-critiques research depth across configurable exploration rounds.

The entire process is visualized in real-time through an interactive **Three.js 3D space telemetry interface** ("The Void"), where an International Space Station (ISS) central hub coordinates data-harvesting rockets that launch outward to orbit planets and return data seeds to base.

---

## ✨ Key Features

- 🛰️ **Stateful Multi-Agent Workflow (LangGraph)**: Controlled state transitions across Planner, Researcher, Critic, and Writer agents with conditional early-exit logic.
- 🚀 **Interactive 3D Telemetry ("The Void")**: Procedural Three.js 3D canvas featuring a central ISS space station, solar panels, thruster plumes, 3 concentric orbit rings, and rockets that fly to planets to harvest data and shift planet colors.
- 🎬 **Full-Screen Cinematic Telemetry Mode**: Automatically switches to an immersive full-screen sci-fi cockpit view during active research runs with live signal logs and HUD stats.
- 📑 **Section-Level Report Refinement**: Select any specific section of a generated report and submit custom refinement instructions (e.g. *"Add hardware VRAM benchmarks"* or *"Focus on local deployment tradeoffs"*) to rewrite just that section while maintaining citations.
- 📊 **Rich Unstructured Content Scraper**: Deterministic HTML parser extracting body text, blockquotes, outbound links, HTML tables (formatted as Markdown via Pandas), and raw LaTeX/MathML equations.
- 🖼️ **Multimodal Image Relevance Routing**: Filters up to 5 image candidates per page using LLM metadata routing to skip ads and UI icons while extracting relevant diagrams and technical charts.
- 🎯 **Confidence-Scored Citations**: The Writer agent grades source reliability and outputs inline citations with confidence scores (`[Source X (Confidence: High/Medium/Low)]`).
- ⚡ **Dual LLM Endpoint Support**: Seamlessly switch between local GGUF models (`llama-server` on port 8085 / 8080) and NVIDIA NIM Cloud API endpoints. Includes 1.8s automatic rate-limit throttling (40 RPM cap compliance) and key verification endpoints.
- 🗂️ **Persistent History & Management**: LocalStorage history management with individual search deletion, clear-all functionality, and quick report preview.
- 🧪 **Model Sandbox Overlay**: Built-in prompt playground modal (`QuickChat`) to test model connectivity, system prompts, and responses on the fly.

---

## 🧬 Multi-Agent Architecture

Wayfarer's backend graph is orchestrated via **LangGraph**. The workflow follows a structured loop:

```
                  +-------------------+
                  |   User Prompt     |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  |   Planner Node    |
                  |  - Sub-questions  |
                  |  - Initial query  |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  |  Researcher Node  |
                  |  - DuckDuckGo API |
                  |  - HTML Scraper   |
                  |  - Table/Math Ext |
                  |  - Image Routing  |
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  |    Critic Node    |
                  |  - Evaluate gaps  |
                  |  - Next query/exit|
                  +---------+---------+
                            |
             +--------------+--------------+
             |                             |
  [Coverage Insufficient &         [Coverage Sufficient OR
   Current Round < Max]            Max Rounds Reached]
             |                             |
             v                             v
   (Loop Back to Researcher)     +-------------------+
                                 |    Writer Node    |
                                 |  - Deep synthesis |
                                 |  - Confidence cite|
                                 +---------+---------+
                                           |
                                           v
                                        [ END ]
```

### Node Descriptions
1. **Planner (`app/agents/planner.py`)**: Breaks down the topic into 3 distinct sub-questions and formulates the optimal starting search query.
2. **Researcher (`app/agents/researcher.py`)**: Runs search queries, fetches top web pages, parses text, extracts tables/LaTeX math, evaluates up to 5 image candidates per page, and aggregates verified sources into state.
3. **Critic (`app/agents/critic.py`)**: Analyzes current evidence against sub-questions. If information coverage is sufficient or max rounds are met, it triggers the Writer; otherwise, it generates a refined follow-up query for the next round.
4. **Writer (`app/agents/writer.py`)**: Synthesizes all gathered sources into an exhaustive, publication-grade Markdown report with title, executive summary, analytical tables, topic sections, and a references bibliography.

---

## 🛸 3D Space Visualizer ("The Void")

The frontend includes a custom **Three.js WebGL visualizer** (`frontend/src/components/TheVoid.jsx`) rendering real-time telemetry:

- **Central ISS Space Hub**: Built with modular metallic habitat cylinders, lateral support trusses, four dark-blue solar panel arrays, and glowing cyan thruster plumes.
- **Concentric Orbit Rings**: 3 distinct dust particle rings (radii 6.0, 11.5, and 17.0) representing research rounds 1, 2, and 3.
- **Data Planets**: Pre-generated planets positioned on the orbit rings. As the Researcher node scrapes new web sources, rockets launch from the space station to the target round planet, updating the planet's glow color (Cyan $\rightarrow$ Green $\rightarrow$ Gold $\rightarrow$ Purple $\rightarrow$ Pink $\rightarrow$ Blue) upon data arrival.
- **Two-Phase Rocket Trajectories**: Rockets shoot outward from the station to the planet during data harvest (70% flight phase) and execute a fast 180° turn back to the station (30% flight phase) before the next round begins.
- **Glassmorphic Integration**: The visualizer floats in the background behind ultra-transparent dark glass panels (`rgba(6, 6, 8, 0.16)` fill with `blur(2px)` backdrop filter) for a sharp, executive look.

---

## 🛠️ Technology Stack

### Backend
- **Language**: Python 3.10+
- **Framework**: FastAPI, Uvicorn
- **Agent Graph**: LangGraph, LangChain Core
- **Scraper & Parsing**: BeautifulSoup4, Pandas, Requests, Re
- **Networking**: WebSockets (`asyncio`), HTTPX

### Frontend
- **Framework**: React 18, Vite
- **3D Graphics Engine**: Three.js (`three`)
- **Icons & Styling**: Lucide React (`lucide-react`), Vanilla CSS3 with CSS Tokens
- **Markdown Rendering**: Marked (`marked`)

---

## 🚀 Quickstart Guide

### Option 1: One-Click Startup Script (Linux / WSL 2)

Wayfarer includes a root-level shell script that automatically initializes virtual environments, installs missing packages, and launches both backend and frontend servers:

```bash
# Clone repository
git clone https://github.com/iam-tarun-86/wayfarer.git
cd Wayfarer

# Give execution permission and run
chmod +x start.sh
./start.sh
```

- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000/health`
- *Press `Ctrl+C` in the terminal to cleanly stop both servers.*

---

### Option 2: Native Windows Installation

Run Wayfarer natively on Windows without WSL 2:

#### Prerequisites
1. **Git for Windows**: Download from [git-scm.com](https://git-scm.com/)
2. **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
3. **Python 3.10+**: Download from [python.org](https://python.org/) *(Ensure **"Add Python to PATH"** is checked)*

#### Step 1: Clone Repository
Open PowerShell or Command Prompt:
```powershell
git clone https://github.com/iam-tarun-86/wayfarer.git
cd Wayfarer
```

#### Step 2: Configure Environment
Copy `.env.example` to `.env` in the `backend` folder:
```powershell
copy backend\.env.example backend\.env
```

#### Step 3: Launch Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
*(Backend will start on `http://localhost:8000`)*

#### Step 4: Launch Frontend
Open a **new** PowerShell/CMD window:
```powershell
cd Wayfarer\frontend
npm install
npm run dev
```
*(Frontend will start on `http://localhost:3000`)*

---

### Option 3: Manual Installation

#### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ LLM Provider Configuration

Wayfarer supports dual LLM routing configured via `backend/.env` or dynamically in the UI settings drawer:

```ini
# backend/.env

# Local LLM Server (llama-server / LM Studio / Ollama)
LLAMA_SERVER_URL=http://localhost:8085/v1
MODEL_NAME=gemma-4-e4b-q5_k_m

# NVIDIA NIM Cloud API (Optional)
NVIDIA_API_KEY=nvapi-your-key-here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

# General Settings
DEFAULT_MAX_ROUNDS=3
USE_MOCK_LLM_IF_UNAVAILABLE=true
```

> **Note**: If `llama-server` is not running locally and no NVIDIA API key is supplied, Wayfarer gracefully uses dynamic, topic-aware mock response fallbacks so UI and graph testing work out-of-the-box.

---

## 📡 API & WebSocket Protocol

### REST Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status check |
| `GET` | `/api/llm-status` | Checks if local `llama-server` (port 8085) is online |
| `POST` | `/api/chat` | Utility endpoint for testing LLM prompts |
| `GET` | `/api/nvidia-models` | Returns available models catalog from NVIDIA NIM |
| `GET` | `/api/verify-nvidia-key` | Performs a 1-token ping verification on the NVIDIA API key |

### WebSocket Endpoint (`ws://localhost:8000/ws/research`)

#### Client $\rightarrow$ Server (Start Research)
```json
{
  "topic": "Growth of local LLMs",
  "max_rounds": 3,
  "llm_config": {
    "provider": "nvidia",
    "model": "meta/llama-3.1-70b-instruct",
    "api_key": "nvapi-..."
  }
}
```

#### Server $\rightarrow$ Client (State Update Stream)
```json
{
  "type": "state_update",
  "node": "researcher",
  "state": {
    "current_round": 1,
    "active_node": "researcher",
    "sources": [ ... ],
    "logs": [ ... ]
  }
}
```

#### Client $\rightarrow$ Server (Section-Level Refinement)
```json
{
  "type": "section_rerun",
  "section": "Technical Challenges & Future Outlook",
  "feedback": "Focus more on VRAM quantization tradeoffs and local inference latency."
}
```

---

## 📁 Project Directory Structure

```
Wayfarer/
├── start.sh                      # One-click startup script for Linux/WSL
├── implementation_plan.md       # Technical design implementation plan
├── task.md                       # Task checklist & system status
├── walkthrough.md                # Feature walkthrough document
├── backend/
│   ├── run.py                    # Uvicorn launcher script
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment template
│   └── app/
│       ├── main.py               # FastAPI application & WebSocket handlers
│       ├── config.py             # Pydantic base settings loader
│       ├── agents/
│       │   ├── state.py          # TypedDict ResearchState schema
│       │   ├── graph.py          # LangGraph state machine definition
│       │   ├── planner.py        # Planner agent node
│       │   ├── researcher.py     # Researcher agent node (Scraper + DDG + Image Router)
│       │   ├── critic.py         # Critic agent node (Gap analysis & loop router)
│       │   └── writer.py         # Writer agent node (Report synthesis & citations)
│       └── tools/
│           ├── llm_client.py     # Unified LLM provider client (Local/NVIDIA/Mock)
│           ├── search.py         # DuckDuckGo search wrapper
│           ├── scraper.py        # BeautifulSoup & Pandas unstructured scraper
│           ├── nvidia_catalog.py  # Model catalog classifier
│           └── report_format.py   # Report normalization helper
└── frontend/
    ├── index.html                # HTML entrypoint
    ├── vite.config.js            # Vite configuration
    ├── package.json              # React dependencies
    └── src/
        ├── main.jsx              # React app mount
        ├── index.css             # Glassmorphic dark theme CSS system
        ├── App.jsx               # Main application console layout & state
        ├── hooks/
        │   └── useResearchSocket.js  # WebSocket communication hook
        └── components/
            ├── ResearchForm.jsx  # Input form, prompt templates, settings drawer
            ├── ReportViewer.jsx  # Markdown renderer & section refinement trigger
            ├── TheVoid.jsx       # Three.js 3D space visualizer & ISS hub model
            ├── PastSearches.jsx  # Persistent history list & delete handler
            ├── ReasoningSidebar.jsx# Live logs & network activity sidebar
            ├── QuickChat.jsx     # Model sandbox playground modal
            ├── ActivityFeed.jsx  # Live agent event log stream
            ├── NetworkActivity.jsx # Search query & scrape URL stream
            └── RoundProgress.jsx # Multi-round indicator badge
```

---

## 📄 License & Acknowledgments

Distributed under the **MIT License**. See `LICENSE` for more information.

- **LangGraph**: Framework for building stateful, multi-actor applications with LLMs.
- **Three.js**: JavaScript 3D Library for WebGL space visualization.
- **DuckDuckGo Search**: Privacy-respecting search tools for Python.
- **FastAPI & React**: High-performance backend API and reactive dashboard engine.
