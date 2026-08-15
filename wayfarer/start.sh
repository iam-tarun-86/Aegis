#!/bin/bash

# Exit immediately if any command fails
set -e

# Clear screen
clear

echo "============================================="
echo "🌌 Starting Wayfarer Deep Research System"
echo "============================================="

# Get absolute path to the project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Cleanup function to kill backend and frontend on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo "Wayfarer shut down cleanly."
    exit 0
}

# Trap Ctrl+C (SIGINT) and terminate signals
trap cleanup SIGINT SIGTERM

# 1. Start Backend
echo "-> Starting Backend (FastAPI + LangGraph)..."
cd "$PROJECT_ROOT/backend"
if [ ! -d "venv" ]; then
    echo "Virtual environment not found! Creating..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi
./venv/bin/python run.py &
BACKEND_PID=$!

# 2. Start Frontend
echo "-> Starting Frontend (React + Vite)..."
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    echo "Node modules not found! Installing..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!

echo "============================================="
echo "🚀 Wayfarer is active!"
echo "   - Frontend Dashboard: http://localhost:3000"
echo "   - Backend API status: http://localhost:8000/health"
echo "============================================="
echo "Press Ctrl+C to stop both servers."
echo "============================================="

# Keep script running and wait for background jobs
wait
