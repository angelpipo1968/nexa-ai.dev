"""
Nexa Agent Configuration
========================
Central configuration for the LangGraph agent system running on RTX 3090.
"""
import os
from pathlib import Path
from typing import Optional

# ─── Project Paths ───────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
AGENT_DIR = Path(__file__).parent
MEMORY_DIR = AGENT_DIR / "memory" / "chroma_db"
UPLOAD_DIR = BASE_DIR / "public" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ─── Server Configuration ────────────────────────────────────────────
HOST = os.getenv("NEXA_HOST", "0.0.0.0")
PORT = int(os.getenv("NEXA_PORT", "8000"))
WORKERS = int(os.getenv("NEXA_WORKERS", "1"))

# ─── Model Configuration ────────────────────────────────────────────
# Primary: Local RTX 3090 via vLLM/FastAPI
LOCAL_MODEL_URL = os.getenv("LOCAL_MODEL_URL", "http://127.0.0.1:8000")
LOCAL_MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "nexa-local")

# Fallback: LiteLLM Gateway
LITELLM_URL = os.getenv("LITELLM_URL", "http://127.0.0.1:4000")
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY", "sk-nexa-master-3090")

# Cloud: OpenAI-compatible API
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

# ─── GPU Configuration ──────────────────────────────────────────────
GPU_DEVICE = os.getenv("GPU_DEVICE", "cuda:0")
VRAM_LIMIT_GB = float(os.getenv("VRAM_LIMIT_GB", "22.0"))  # Leave 2GB headroom
SD_MODEL = os.getenv("SD_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
SD_REFINER = os.getenv("SD_REFINER", "stabilityai/stable-diffusion-xl-refiner-1.0")

# ─── Memory Configuration ───────────────────────────────────────────
CHROMA_PERSIST = True
CHROMA_COLLECTION = "nexa_memory"
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
MAX_MEMORY_RESULTS = 5
CONVERSATION_WINDOW = 20  # Messages kept in short-term memory

# ─── Agent Behavior ─────────────────────────────────────────────────
MAX_ITERATIONS = int(os.getenv("MAX_ITERATIONS", "10"))
TIMEOUT_SECONDS = int(os.getenv("TIMEOUT_SECONDS", "120"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.7"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "4096"))

# ─── Tool Permissions ──────────────────────────────────────────────
ENABLE_CODE_EXECUTION = os.getenv("ENABLE_CODE_EXECUTION", "true").lower() == "true"
ENABLE_FILE_OPS = os.getenv("ENABLE_FILE_OPS", "true").lower() == "true"
ENABLE_WEB_SEARCH = os.getenv("ENABLE_WEB_SEARCH", "true").lower() == "true"
ENABLE_IMAGE_GEN = os.getenv("ENABLE_IMAGE_GEN", "true").lower() == "true"
ENABLE_VIDEO_GEN = os.getenv("ENABLE_VIDEO_GEN", "false").lower() == "true"
ENABLE_SHELL = os.getenv("ENABLE_SHELL", "false").lower() == "true"  # Disabled by default

# ─── Safety ──────────────────────────────────────────────────────────
MAX_FILE_SIZE_MB = 50
ALLOWED_FILE_EXTENSIONS = {".txt", ".py", ".js", ".ts", ".json", ".csv", ".md", ".html", ".css", ".tsx", ".jsx"}
BLOCKED_COMMANDS = {"rm -rf /", "format", "del /f", "mkfs", "dd if="}

# ─── Model Router ───────────────────────────────────────────────────
MODEL_ROUTING = {
    "simple_chat": {"model": "local", "temperature": 0.7},
    "code_generation": {"model": "local", "temperature": 0.2},
    "reasoning": {"model": "local", "temperature": 0.3},
    "creative_writing": {"model": "local", "temperature": 0.9},
    "image_description": {"model": "cloud", "temperature": 0.5},
    "complex_analysis": {"model": "local", "temperature": 0.4},
}


def get_model_config(task_type: str = "simple_chat") -> dict:
    """Get model configuration based on task type."""
    return MODEL_ROUTING.get(task_type, MODEL_ROUTING["simple_chat"])
