#!/bin/bash

# ==========================================
# NEXA AI - Master Environment Setup Script
# ==========================================

set -e # Exit on error

# Colors for UI
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "███╗   ██╗███████╗██╗  ██╗ █████╗ "
echo "████╗  ██║██╔════╝╚██╗██╔╝██╔══██╗"
echo "██╔██╗ ██║█████╗   ╚███╔╝ ███████║"
echo "██║╚██╗██║██╔══╝   ██╔██╗ ██╔══██║"
echo "██║ ╚████║███████╗██╔╝ ██╗██║  ██║"
echo "╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝"
echo -e "${NC}Starting Environment Setup...\n"

# 1. Start Docker Containers
echo -e "${YELLOW}[1/3] Checking Docker Containers...${NC}"
if docker compose up -d; then
    echo -e "${GREEN}✓ Docker containers are up and running!${NC}\n"
else
    echo "❌ Error starting docker containers. Is Docker running?"
    exit 1
fi

# 2. Setup Python Virtual Environment
VENV_PATH=".venv"
echo -e "${YELLOW}[2/3] Setting up Python Virtual Environment...${NC}"

if [ ! -d "$VENV_PATH" ]; then
    echo "Creating new virtual environment at $VENV_PATH..."
    python3 -m venv $VENV_PATH
fi

echo "Activating virtual environment..."
source $VENV_PATH/bin/activate
echo -e "${GREEN}✓ Virtual environment activated!${NC}\n"

# 3. Install Dependencies for Skills and RAG
echo -e "${YELLOW}[3/3] Installing Dependencies for Skills...${NC}"

MCP_REQS="nexa-ai-android/skills/mcp-core-pack/requirements.txt"
RAG_REQS="nexa-ai-android/skills/rag-pipeline/requirements.txt"

if [ -f "$MCP_REQS" ]; then
    echo "Installing MCP Core Pack dependencies..."
    pip install -r "$MCP_REQS" --quiet
fi

if [ -f "$RAG_REQS" ]; then
    echo "Installing RAG Pipeline dependencies..."
    pip install -r "$RAG_REQS" --quiet
fi

echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN}✓ NEXA AI ENVIRONMENT IS READY!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo -e "To activate the environment in your terminal, run:"
echo -e "${BLUE}source .venv/bin/activate${NC}"
echo ""
