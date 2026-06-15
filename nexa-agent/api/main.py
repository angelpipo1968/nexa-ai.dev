"""
Nexa Agent API
===============
FastAPI server that exposes the LangGraph agent with:
- Chat endpoint (with streaming)
- Memory management
- GPU monitoring
- Image generation
- Health checks
"""
import os
import sys
import time
import json
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import (
    HOST, PORT, WORKERS, TEMPERATURE, MAX_TOKENS,
    LOCAL_MODEL_URL, LITELLM_URL, LITELLM_API_KEY,
    ENABLE_IMAGE_GEN, ENABLE_VIDEO_GEN, ENABLE_CODE_EXECUTION, ENABLE_WEB_SEARCH,
    MAX_ITERATIONS
)

# ─── FastAPI App ────────────────────────────────────────────────────
app = FastAPI(
    title="Nexa AI Agent",
    description="Intelligent AI Agent powered by LangGraph on RTX 3090",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request Models ─────────────────────────────────────────────────
class ChatRequest(BaseModel):
    """Standard chat request."""
    message: str
    task_type: str = "simple_chat"
    use_memory: bool = True
    stream: bool = False
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    """Standard chat response."""
    response: str
    iterations: int
    elapsed_seconds: float
    task_type: str
    model_route: str
    datacenter: bool = True
    success: bool

class MemoryRequest(BaseModel):
    """Add a memory entry."""
    text: str
    source: str = "manual"
    category: str = "general"

class ImageRequest(BaseModel):
    """Image generation request."""
    prompt: str
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024
    steps: int = 30

class VideoRequest(BaseModel):
    """Video generation request."""
    prompt: str
    negative_prompt: str = ""
    num_frames: int = 16
    steps: int = 25
    fps: int = 8


# ─── Health Endpoints ───────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """Check the health of the agent system and GPU."""
    health_data = {
        "status": "online",
        "version": "2.0.0",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "uptime": time.time(),
        "agent": "langgraph",
        "features": {
            "image_gen": ENABLE_IMAGE_GEN,
            "code_exec": ENABLE_CODE_EXECUTION,
            "web_search": ENABLE_WEB_SEARCH,
        },
        "gpu": None,
        "memory": None,
    }
    
    # Check GPU
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        if gpus:
            gpu = gpus[0]
            health_data["gpu"] = {
                "name": gpu.name,
                "vram_used_mb": round(gpu.memoryUsed),
                "vram_total_mb": round(gpu.memoryTotal),
                "vram_percent": round(gpu.memoryUtil * 100, 1),
                "temperature_c": gpu.temperature,
                "utilization_percent": round(gpu.load * 100, 1),
            }
    except:
        try:
            proc = await asyncio.create_subprocess_exec(
                "nvidia-smi", "--query-gpu=name,memory.used,memory.total,temperature.gpu,utilization.gpu",
                "--format=csv,noheader,nounits",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
            if stdout:
                parts = stdout.decode().strip().split(", ")
                if len(parts) >= 5:
                    health_data["gpu"] = {
                        "name": parts[0].strip(),
                        "vram_used_mb": float(parts[1]),
                        "vram_total_mb": float(parts[2]),
                        "temperature_c": float(parts[3]),
                        "utilization_percent": float(parts[4]),
                    }
        except:
            health_data["gpu"] = {"status": "unavailable"}
    
    # Check memory
    try:
        from memory.vector_store import MemoryStore
        mem = MemoryStore()
        health_data["memory"] = mem.stats()
    except Exception as e:
        health_data["memory"] = {"status": "unavailable", "error": str(e)}
    
    # Check LiteLLM
    litellm_status = "offline"
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{LITELLM_URL}/health")
            if resp.status_code == 200:
                litellm_status = "online"
    except:
        pass
    health_data["litellm"] = litellm_status
    
    return health_data


@app.get("/")
async def root():
    """Root endpoint - basic info."""
    return {
        "name": "Nexa AI Agent",
        "version": "2.0.0",
        "engine": "LangGraph",
        "gpu": "RTX 3090",
        "docs": "/docs",
        "health": "/health",
    }


# ─── Chat Endpoints ─────────────────────────────────────────────────
@app.post("/chat")
async def chat(request: ChatRequest):
    """Standard chat endpoint - returns complete response."""
    from agent.brain import run_agent
    
    result = await run_agent(
        message=request.message,
        task_type=request.task_type,
        use_memory=request.use_memory,
    )
    
    return result


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint - returns tokens as they're generated."""
    from agent.brain import stream_agent
    
    async def generate():
        async for chunk in stream_agent(
            message=request.message,
            task_type=request.task_type,
            use_memory=request.use_memory,
        ):
            yield f"data: {json.dumps(chunk)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ─── Deliberate Endpoint (compatible with existing V5 API) ──────────
@app.post("/deliberate")
async def deliberate(request: Request):
    """Deliberate endpoint - compatible with existing V5 API format."""
    body = await request.json()
    prompt = body.get("prompt", body.get("message", body.get("content", "")))
    
    if not prompt:
        raise HTTPException(status_code=400, detail="No prompt provided")
    
    from agent.brain import run_agent
    
    result = await run_agent(
        message=prompt,
        task_type="reasoning",
        use_memory=True,
    )
    
    return {
        "response": result["response"],
        "iterations": result["iterations"],
        "elapsed": result["elapsed_seconds"],
        "model": result["model_route"],
        "datacenter": True,
    }


# ─── Route Endpoint (compatible with existing V5 API) ───────────────
@app.post("/route")
async def route_prompt(request: Request):
    """Route endpoint - compatible with existing V5 API format."""
    body = await request.json()
    prompt = body.get("prompt", body.get("message", ""))
    task_type = body.get("task_type", "simple_chat")
    
    if not prompt:
        raise HTTPException(status_code=400, detail="No prompt provided")
    
    from agent.brain import run_agent
    
    result = await run_agent(
        message=prompt,
        task_type=task_type,
        use_memory=True,
    )
    
    return {
        "response": result["response"],
        "task_type": task_type,
        "model": result["model_route"],
        "datacenter": result["success"],
        "elapsed": result["elapsed_seconds"],
    }


# ─── Job Result Endpoint (compatible with existing V5 API) ──────────
@app.get("/result/{job_id}")
async def get_job_result(job_id: str):
    """Get job result - returns status for compatibility."""
    return {
        "job_id": job_id,
        "status": "completed",
        "message": "This endpoint is for compatibility. All responses are now synchronous.",
    }


# ─── Memory Endpoints ──────────────────────────────────────────────
@app.post("/memory/add")
async def add_memory(request: MemoryRequest):
    """Add a fact or knowledge to long-term memory."""
    try:
        from memory.vector_store import MemoryStore
        mem = MemoryStore()
        doc_id = mem.add_fact(
            fact=request.text,
            source=request.source,
            category=request.category,
        )
        return {"status": "saved", "id": doc_id, "text": request.text[:100]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/search")
async def search_memory(query: str, n: int = 5):
    """Search long-term memory."""
    try:
        from memory.vector_store import MemoryStore
        mem = MemoryStore()
        results = mem.search(query, n_results=n)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memory/stats")
async def memory_stats():
    """Get memory statistics."""
    try:
        from memory.vector_store import MemoryStore
        mem = MemoryStore()
        return mem.stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/memory/clear")
async def clear_memory():
    """Clear all memories."""
    try:
        from memory.vector_store import MemoryStore
        mem = MemoryStore()
        count = mem.clear_all()
        return {"status": "cleared", "deleted_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── GPU Endpoint ───────────────────────────────────────────────────
@app.get("/gpu/status")
async def gpu_status():
    """Detailed GPU status for the RTX 3090."""
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        if gpus:
            gpu = gpus[0]
            return {
                "name": gpu.name,
                "vram_used_mb": round(gpu.memoryUsed),
                "vram_total_mb": round(gpu.memoryTotal),
                "vram_free_mb": round(gpu.memoryFree),
                "vram_percent": round(gpu.memoryUtil * 100, 1),
                "temperature_c": gpu.temperature,
                "utilization_percent": round(gpu.load * 100, 1),
                "uuid": gpu.uuid,
            }
    except:
        pass
    
    # Fallback to nvidia-smi
    try:
        proc = await asyncio.create_subprocess_exec(
            "nvidia-smi", "--query-gpu=name,memory.used,memory.total,memory.free,temperature.gpu,utilization.gpu",
            "--format=csv,noheader,nounits",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
        if stdout:
            parts = stdout.decode().strip().split(", ")
            if len(parts) >= 6:
                return {
                    "name": parts[0],
                    "vram_used_mb": float(parts[1]),
                    "vram_total_mb": float(parts[2]),
                    "vram_free_mb": float(parts[3]),
                    "temperature_c": float(parts[4]),
                    "utilization_percent": float(parts[5]),
                }
    except:
        pass
    
    return {"status": "unavailable", "message": "Install nvidia-smi or GPUtil"}


# ─── Image Generation Endpoint ──────────────────────────────────────
@app.post("/generate/image")
async def generate_image_api(request: ImageRequest):
    """Generate an image using Stable Diffusion XL on RTX 3090."""
    if not ENABLE_IMAGE_GEN:
        raise HTTPException(status_code=403, detail="Image generation is disabled")
    
    try:
        from tools.tools import generate_image
        result = await generate_image.ainvoke({
            "prompt": request.prompt,
            "negative_prompt": request.negative_prompt,
            "width": request.width,
            "height": request.height,
            "steps": request.steps,
        })
        return {"status": "generated", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Video Generation Endpoint ──────────────────────────────────────
@app.post("/generate/video")
async def generate_video_api(request: VideoRequest):
    """Generate a short video using AnimateDiff on RTX 3090."""
    if not ENABLE_VIDEO_GEN:
        raise HTTPException(status_code=403, detail="Video generation is disabled")
    
    try:
        from tools.tools import generate_video
        result = await generate_video.ainvoke({
            "prompt": request.prompt,
            "negative_prompt": request.negative_prompt,
            "num_frames": request.num_frames,
            "steps": request.steps,
            "fps": request.fps,
        })
        return {"status": "generated", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── OpenAI-Compatible Endpoints ────────────────────────────────────
@app.get("/v1/models")
async def list_models():
    """OpenAI-compatible models list."""
    return {
        "object": "list",
        "data": [
            {
                "id": "nexa-local",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "nexa-ai",
                "permission": [],
            },
            {
                "id": "nexa-agent",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "nexa-ai",
                "permission": [],
            },
        ]
    }


@app.post("/v1/chat/completions")
async def openai_chat_completions(request: Request):
    """OpenAI-compatible chat completions endpoint."""
    body = await request.json()
    messages = body.get("messages", [])
    stream = body.get("stream", False)
    
    # Extract the last user message
    user_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_message = msg.get("content", "")
            break
    
    if not user_message:
        raise HTTPException(status_code=400, detail="No user message found")
    
    from agent.brain import run_agent, stream_agent
    
    if stream:
        async def generate():
            async for chunk in stream_agent(message=user_message):
                if chunk["type"] == "token":
                    data = {
                        "choices": [{
                            "delta": {"content": chunk["content"]},
                            "index": 0,
                            "finish_reason": None,
                        }],
                        "object": "chat.completion.chunk",
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                elif chunk["type"] == "done":
                    data = {
                        "choices": [{
                            "delta": {},
                            "index": 0,
                            "finish_reason": "stop",
                        }],
                        "object": "chat.completion.chunk",
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                    yield "data: [DONE]\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
    
    # Non-streaming
    result = await run_agent(message=user_message)
    
    return {
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": "nexa-agent",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": result["response"],
            },
            "finish_reason": "stop",
        }],
        "usage": {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        },
    }


# ─── Startup Event ──────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    """Initialize on startup."""
    print("=" * 60)
    print("  Nexa AI Agent v2.0 - LangGraph on RTX 3090")
    print("=" * 60)
    print(f"  Server:     http://{HOST}:{PORT}")
    print(f"  Docs:       http://{HOST}:{PORT}/docs")
    print(f"  Local LLM:  {LOCAL_MODEL_URL}")
    print(f"  LiteLLM:    {LITELLM_URL}")
    print(f"  Image Gen:  {'Enabled' if ENABLE_IMAGE_GEN else 'Disabled'}")
    print(f"  Video Gen:  {'Enabled' if ENABLE_VIDEO_GEN else 'Disabled'}")
    print(f"  Code Exec:  {'Enabled' if ENABLE_CODE_EXECUTION else 'Disabled'}")
    print(f"  Web Search: {'Enabled' if ENABLE_WEB_SEARCH else 'Disabled'}")
    print("=" * 60)
    
    # Try to initialize memory
    try:
        from memory.vector_store import MemoryStore
        mem = MemoryStore()
        stats = mem.stats()
        print(f"  Memory:     {stats['total_memories']} entries loaded")
    except Exception as e:
        print(f"  Memory:     Not available ({e})")
    
    print("=" * 60)


# ─── Run Server ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=HOST,
        port=PORT,
        workers=WORKERS,
        reload=False,
        log_level="info",
    )
