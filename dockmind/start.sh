#!/bin/bash

# Ensure we clean up background processes if the user presses Ctrl+C
trap 'kill %1; kill %2; exit' SIGINT SIGTERM

echo "====================================="
echo "🚀 Starting Doc-QA-Agent..."
echo "====================================="

# Get absolute path to the project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "[1/2] Starting Backend (FastAPI) on port 8001..."
cd "$PROJECT_ROOT/backend"
source venv/bin/activate
uvicorn main:app --port 8001 --reload &
BACKEND_PID=$!

echo "[2/2] Starting Frontend (Vite) on port 5173..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting up!"
echo "   - Frontend UI: http://localhost:5173"
echo "   - Backend API: http://localhost:8001"
echo "   - (Ensure llama.cpp is running on port 8085)"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for both processes so the script doesn't exit immediately
wait $BACKEND_PID $FRONTEND_PID
