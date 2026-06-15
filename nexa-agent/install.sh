#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  Nexa AI Agent - Auto Installer
#  Sets up the LangGraph agent system on RTX 3090 server
# ═══════════════════════════════════════════════════════════════════
set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       Nexa AI Agent - LangGraph Installer for RTX 3090     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ─── Check Python ──────────────────────────────────────────────────
echo "🔍 Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo "❌ Python 3.10+ is required. Install it first."
    exit 1
fi

PYTHON_VERSION=$($PYTHON --version 2>&1 | awk '{print $2}')
echo "   ✅ Python $PYTHON_VERSION found"

# ─── Check CUDA/GPU ────────────────────────────────────────────────
echo ""
echo "🔍 Checking GPU..."
if command -v nvidia-smi &> /dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null)
    echo "   ✅ GPU: $GPU_INFO"
else
    echo "   ⚠️  nvidia-smi not found. GPU features may not work."
fi

# ─── Create Virtual Environment ────────────────────────────────────
echo ""
echo "📦 Setting up virtual environment..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

if [ ! -d "$VENV_DIR" ]; then
    $PYTHON -m venv "$VENV_DIR"
    echo "   ✅ Created virtual environment"
else
    echo "   ✅ Virtual environment already exists"
fi

# Activate venv
source "$VENV_DIR/bin/activate"

# ─── Upgrade pip ────────────────────────────────────────────────────
echo ""
echo "📦 Upgrading pip..."
pip install --upgrade pip setuptools wheel -q

# ─── Install Core Dependencies ─────────────────────────────────────
echo ""
echo "📦 Installing LangGraph + LangChain..."
pip install langchain>=0.3.0 langchain-community>=0.3.0 langgraph>=0.2.0 langchain-openai>=0.2.0 langchain-core>=0.3.0 -q

echo "📦 Installing FastAPI + server..."
pip install fastapi>=0.115.0 "uvicorn[standard]>=0.32.0" pydantic>=2.9.0 -q

echo "📦 Installing ChromaDB (memory)..."
pip install chromadb>=0.5.0 sentence-transformers>=3.0.0 -q

echo "📦 Installing tools..."
pip install duckduckgo-search>=6.3.0 wikipedia>=1.4.0 python-dotenv>=1.0.0 httpx>=0.27.0 aiofiles>=24.1.0 psutil>=6.0.0 GPUtil>=1.4.0 -q

# ─── Install PyTorch + Diffusers (Optional - for Image Gen) ────────
echo ""
read -p "🎨 Install Stable Diffusion XL for image generation? (needs ~7GB download) [y/N]: " INSTALL_SD
if [[ "$INSTALL_SD" =~ ^[Yy]$ ]]; then
    echo "📦 Installing PyTorch + Diffusers (this may take a while)..."
    
    # Check if PyTorch with CUDA is already installed
    if pip show torch &> /dev/null; then
        TORCH_CUDA=$(python -c "import torch; print(torch.cuda.is_available())" 2>/dev/null || echo "False")
        if [ "$TORCH_CUDA" = "True" ]; then
            echo "   ✅ PyTorch with CUDA already installed"
        else
            echo "   ⚠️  PyTorch found but no CUDA. Reinstalling with CUDA support..."
            pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121 -q
        fi
    else
        pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121 -q
    fi
    
    pip install diffusers>=0.31.0 transformers>=4.46.0 accelerate>=1.1.0 safetensors>=0.4.0 -q
    echo "   ✅ Image generation dependencies installed"
    
    # Enable in config
    export ENABLE_IMAGE_GEN=true
    echo "   ✅ Image generation ENABLED"
else
    echo "   ⏭️  Skipping image generation dependencies"
fi

# ─── Create Directories ────────────────────────────────────────────
echo ""
echo "📁 Creating directories..."
mkdir -p "$SCRIPT_DIR/memory/chroma_db"
mkdir -p "$SCRIPT_DIR/../public/uploads"
echo "   ✅ Directories created"

# ─── Test Import ───────────────────────────────────────────────────
echo ""
echo "🧪 Testing imports..."
python -c "import langchain; print(f'   ✅ LangChain {langchain.__version__}')" 2>/dev/null || echo "   ⚠️ LangChain import issue"
python -c "import langgraph; print('   ✅ LangGraph')" 2>/dev/null || echo "   ⚠️ LangGraph import issue"
python -c "import chromadb; print(f'   ✅ ChromaDB {chromadb.__version__}')" 2>/dev/null || echo "   ⚠️ ChromaDB import issue"
python -c "import fastapi; print(f'   ✅ FastAPI {fastapi.__version__}')" 2>/dev/null || echo "   ⚠️ FastAPI import issue"

# ─── Create .env file ─────────────────────────────────────────────
echo ""
echo "📝 Creating .env file..."
cat > "$SCRIPT_DIR/.env" << 'EOF'
# Nexa AI Agent Configuration
# ============================

# Server
NEXA_HOST=0.0.0.0
NEXA_PORT=8000

# Local RTX 3090 Model
LOCAL_MODEL_URL=http://127.0.0.1:8000
LOCAL_MODEL_NAME=nexa-local

# LiteLLM Gateway
LITELLM_URL=http://127.0.0.1:4000
LITELLM_API_KEY=sk-nexa-master-3090

# Cloud API (optional - leave empty to disable)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o

# GPU
GPU_DEVICE=cuda:0
VRAM_LIMIT_GB=22.0

# Stable Diffusion Model
SD_MODEL=stabilityai/stable-diffusion-xl-base-1.0

# Memory
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Features
ENABLE_CODE_EXECUTION=true
ENABLE_FILE_OPS=true
ENABLE_WEB_SEARCH=true
ENABLE_IMAGE_GEN=true
ENABLE_VIDEO_GEN=false
ENABLE_SHELL=false

# Agent
MAX_ITERATIONS=10
TEMPERATURE=0.7
MAX_TOKENS=4096
EOF
echo "   ✅ .env file created"

# ─── Create systemd service (optional) ─────────────────────────────
echo ""
read -p "🔧 Create systemd service for auto-start? [y/N]: " CREATE_SERVICE
if [[ "$CREATE_SERVICE" =~ ^[Yy]$ ]]; then
    cat > /tmp/nexa-agent.service << EOF
[Unit]
Description=Nexa AI Agent - LangGraph on RTX 3090
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=$VENV_DIR/bin/python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
Environment=PYTHONPATH=$SCRIPT_DIR

[Install]
WantedBy=multi-user.target
EOF
    sudo mv /tmp/nexa-agent.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable nexa-agent
    echo "   ✅ Systemd service created (start with: sudo systemctl start nexa-agent)"
else
    echo "   ⏭️  Skipping systemd service"
fi

# ─── Done! ──────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ✅ INSTALLATION COMPLETE!                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  To start the agent:                                         ║"
echo "║    cd $SCRIPT_DIR"
echo "║    source venv/bin/activate                                  ║"
echo "║    python -m uvicorn api.main:app --host 0.0.0.0 --port 8000║"
echo "║                                                              ║"
echo "║  Or with PM2:                                                ║"
echo "║    pm2 start \"uvicorn api.main:app --host 0.0.0.0\" \\        ║"
echo "║         --name nexa-agent --interpreter venv/bin/python      ║"
echo "║                                                              ║"
echo "║  Test it:                                                    ║"
echo "║    curl http://localhost:8000/health                          ║"
echo "║    http://localhost:8000/docs                                 ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
