"""
Nexa Agent Tools
================
All tools the agent can use: web search, code execution, file operations,
image generation, shell commands, and GPU monitoring.
"""
import os
import json
import subprocess
import tempfile
import asyncio
from pathlib import Path
from typing import Optional, Annotated

from langchain_core.tools import tool
from langchain_core.callbacks import CallbackManagerForToolRun


# ─── Web Search Tool ────────────────────────────────────────────────
@tool
async def web_search(query: str, num_results: int = 5) -> str:
    """Search the web for information. Use this to find current data, news, facts, or any information you don't know.
    
    Args:
        query: The search query string
        num_results: Number of results to return (1-10)
    """
    try:
        from duckduckgo_search import DDGS
        ddgs = DDGS()
        results = ddgs.text(query, max_results=min(num_results, 10))
        if not results:
            return "No results found for your query."
        
        formatted = []
        for i, r in enumerate(results, 1):
            formatted.append(
                f"{i}. **{r.get('title', 'No title')}**\n"
                f"   URL: {r.get('href', 'N/A')}\n"
                f"   {r.get('body', 'No description')}"
            )
        return "\n\n".join(formatted)
    except ImportError:
        return "Error: duckduckgo-search not installed. Run: pip install duckduckgo-search"
    except Exception as e:
        return f"Search error: {str(e)}"


# ─── Code Execution Tool ───────────────────────────────────────────
@tool
async def execute_python(code: str, timeout: int = 30) -> str:
    """Execute Python code and return the output. Use this for calculations, data processing, or any computational task.
    
    Args:
        code: Python code to execute
        timeout: Maximum execution time in seconds (default 30, max 120)
    """
    timeout = min(timeout, 120)
    
    # Safety checks
    dangerous_patterns = ["os.system", "subprocess.call", "__import__", "exec(", "eval(", "open('/"]
    for pattern in dangerous_patterns:
        if pattern in code and "print" not in code.split(pattern)[0]:
            return f"Security: Pattern '{pattern}' requires review. Code not executed."
    
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            f.flush()
            temp_path = f.name
        
        proc = await asyncio.create_subprocess_exec(
            "python3", temp_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=timeout
            )
        except asyncio.TimeoutError:
            proc.kill()
            os.unlink(temp_path)
            return f"Timeout: Code execution exceeded {timeout}s limit."
        
        os.unlink(temp_path)
        
        result = ""
        if stdout:
            result += stdout.decode('utf-8', errors='replace')
        if stderr:
            result += f"\n[stderr]: {stderr.decode('utf-8', errors='replace')}"
        
        return result if result.strip() else "Code executed successfully (no output)."
    
    except Exception as e:
        return f"Execution error: {str(e)}"


# ─── File Operations ───────────────────────────────────────────────
@tool
async def read_file(file_path: str) -> str:
    """Read the contents of a file. Use this to inspect code, config files, or data files.
    
    Args:
        file_path: Path to the file to read
    """
    try:
        path = Path(file_path).resolve()
        
        # Safety: prevent reading sensitive files
        restricted = {"/etc/shadow", "/etc/passwd", "/root/.ssh", "/.env"}
        if any(str(path).startswith(r) for r in restricted):
            return "Access denied: Cannot read sensitive system files."
        
        if not path.exists():
            return f"Error: File not found: {file_path}"
        
        if path.stat().st_size > 50 * 1024 * 1024:  # 50MB limit
            return "Error: File too large (max 50MB)."
        
        content = path.read_text(encoding='utf-8', errors='replace')
        return content[:50000]  # Cap at 50K chars
    
    except Exception as e:
        return f"Error reading file: {str(e)}"


@tool
async def write_file(file_path: str, content: str) -> str:
    """Write content to a file. Use this to create or update files.
    
    Args:
        file_path: Path where to write the file
        content: Content to write
    """
    try:
        path = Path(file_path).resolve()
        
        # Only allow writing within project directories
        allowed_dirs = ["/home/z/my-project/", "/tmp/nexa-agent/"]
        if not any(str(path).startswith(d) for d in allowed_dirs):
            return f"Access denied: Can only write within {allowed_dirs}"
        
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding='utf-8')
        return f"Successfully wrote {len(content)} characters to {file_path}"
    
    except Exception as e:
        return f"Error writing file: {str(e)}"


@tool
async def list_directory(dir_path: str = ".", pattern: str = "*") -> str:
    """List files and directories. Use this to explore project structure.
    
    Args:
        dir_path: Directory path to list (default: current directory)
        pattern: Glob pattern to filter files (default: * for all)
    """
    try:
        path = Path(dir_path).resolve()
        if not path.exists():
            return f"Error: Directory not found: {dir_path}"
        if not path.is_dir():
            return f"Error: Not a directory: {dir_path}"
        
        items = sorted(path.glob(pattern))
        result = []
        for item in items[:100]:  # Limit to 100 items
            size = ""
            if item.is_file():
                try:
                    size = f" ({item.stat().st_size:,} bytes)"
                except:
                    pass
            prefix = "📁" if item.is_dir() else "📄"
            result.append(f"{prefix} {item.name}{size}")
        
        return "\n".join(result) if result else "Empty directory."
    
    except Exception as e:
        return f"Error listing directory: {str(e)}"


# ─── GPU Monitoring ─────────────────────────────────────────────────
@tool
async def gpu_status() -> str:
    """Check RTX 3090 GPU status including VRAM usage, temperature, and utilization. Use this when the user asks about GPU status or when debugging performance."""
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        if not gpus:
            return "No GPU detected. Running on CPU only."
        
        gpu = gpus[0]  # Primary GPU
        return (
            f"🎮 **{gpu.name}**\n"
            f"   VRAM: {gpu.memoryUsed:.0f}/{gpu.memoryTotal:.0f} MB "
            f"({gpu.memoryUtil*100:.1f}% used)\n"
            f"   Temperature: {gpu.temperature}°C\n"
            f"   Utilization: {gpu.load*100:.1f}%\n"
            f"   Free VRAM: {gpu.memoryFree:.0f} MB"
        )
    except ImportError:
        # Fallback to nvidia-smi
        try:
            proc = await asyncio.create_subprocess_exec(
                "nvidia-smi", "--query-gpu=name,memory.used,memory.total,temperature.gpu,utilization.gpu",
                "--format=csv,noheader,nounits",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
            return f"🎮 GPU Status:\n{stdout.decode()}"
        except:
            return "GPU monitoring unavailable. Install GPUtil or nvidia-smi."
    except Exception as e:
        return f"GPU check error: {str(e)}"


# ─── Image Generation (Stable Diffusion on RTX 3090) ────────────────
@tool
async def generate_image(prompt: str, negative_prompt: str = "", width: int = 1024, height: int = 1024, steps: int = 30) -> str:
    """Generate an image using Stable Diffusion XL on the RTX 3090. Use this when the user wants to create, draw, or generate an image/picture/artwork.
    
    Args:
        prompt: Description of the image to generate (be detailed for best results)
        negative_prompt: What to avoid in the image (optional)
        width: Image width (default 1024, must be multiple of 8)
        height: Image height (default 1024, must be multiple of 8)
        steps: Number of inference steps (default 30, more = better quality but slower)
    """
    try:
        import torch
        from diffusers import StableDiffusionXLPipeline
        from config.settings import SD_MODEL, UPLOAD_DIR, GPU_DEVICE
        
        # Round to nearest multiple of 8
        width = (width // 8) * 8
        height = (height // 8) * 8
        
        # Load pipeline (with caching handled by diffusers)
        pipe = StableDiffusionXLPipeline.from_pretrained(
            SD_MODEL,
            torch_dtype=torch.float16,
            use_safetensors=True,
            variant="fp16"
        )
        pipe = pipe.to(GPU_DEVICE)
        pipe.enable_model_cpu_offload()  # Smart VRAM management
        
        image = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt or "low quality, blurry, distorted",
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=7.5,
        ).images[0]
        
        # Save
        import time
        filename = f"sd_{int(time.time())}.png"
        filepath = UPLOAD_DIR / filename
        image.save(str(filepath))
        
        return f"Image generated successfully! Saved to: /uploads/{filename}\nPrompt: {prompt}\nSize: {width}x{height}\nSteps: {steps}"
    
    except ImportError as e:
        return f"Image generation not available. Missing dependencies: {str(e)}\nInstall: pip install diffusers transformers accelerate torch safetensors"
    except Exception as e:
        return f"Image generation error: {str(e)}"


# ─── Shell Command (Restricted) ─────────────────────────────────────
@tool
async def run_shell_command(command: str, timeout: int = 30) -> str:
    """Run a shell command on the server. USE WITH CAUTION - only for safe operations like git, ls, pip, etc.
    
    Args:
        command: Shell command to execute
        timeout: Maximum execution time in seconds (default 30, max 60)
    """
    from config.settings import BLOCKED_COMMANDS, ENABLE_SHELL
    
    if not ENABLE_SHELL:
        return "Shell execution is disabled for safety. Set ENABLE_SHELL=true to enable."
    
    # Block dangerous commands
    for blocked in BLOCKED_COMMANDS:
        if blocked in command:
            return f"Blocked: Command contains dangerous pattern '{blocked}'."
    
    timeout = min(timeout, 60)
    
    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        
        result = ""
        if stdout:
            result += stdout.decode('utf-8', errors='replace')[:10000]
        if stderr:
            result += f"\n[stderr]: {stderr.decode('utf-8', errors='replace')[:5000]}"
        
        return result if result.strip() else f"Command completed (exit code: {proc.returncode})"
    
    except asyncio.TimeoutError:
        proc.kill()
        return f"Timeout: Command exceeded {timeout}s limit."
    except Exception as e:
        return f"Shell error: {str(e)}"


# ─── Wikipedia Tool ─────────────────────────────────────────────────
@tool
async def search_wikipedia(query: str, sentences: int = 3) -> str:
    """Search Wikipedia for factual information. Use this for encyclopedic knowledge, history, science, etc.
    
    Args:
        query: Search term or phrase
        sentences: Number of summary sentences to return (default 3)
    """
    try:
        import wikipedia
        results = wikipedia.search(query, results=3)
        if not results:
            return f"No Wikipedia results found for: {query}"
        
        page = wikipedia.page(results[0], auto_suggest=True)
        summary = wikipedia.summary(results[0], sentences=min(sentences, 10))
        
        return f"**{page.title}**\n\n{summary}\n\nSource: {page.url}"
    except wikipedia.exceptions.DisambiguationError as e:
        return f"Multiple matches: {e.options[:5]}. Please be more specific."
    except Exception as e:
        return f"Wikipedia error: {str(e)}"


# ─── Memory Recall Tool ─────────────────────────────────────────────
@tool
async def recall_memory(query: str, num_results: int = 3) -> str:
    """Search your long-term memory for past conversations and knowledge. Use this when you need to remember something discussed before.
    
    Args:
        query: What to search for in memory
        num_results: Number of memories to retrieve (default 3)
    """
    try:
        from memory.vector_store import MemoryStore
        store = MemoryStore()
        results = store.search(query, n_results=num_results)
        
        if not results:
            return "No relevant memories found."
        
        formatted = []
        for i, (doc, meta) in enumerate(zip(results.get("documents", [[]])[0], results.get("metadatas", [[]])[0]), 1):
            formatted.append(f"{i}. [{meta.get('timestamp', 'unknown')}] {doc[:500]}")
        
        return "\n\n".join(formatted)
    except Exception as e:
        return f"Memory recall error: {str(e)}"


# ─── Tool Collection ────────────────────────────────────────────────
ALL_TOOLS = [
    web_search,
    execute_python,
    read_file,
    write_file,
    list_directory,
    gpu_status,
    generate_image,
    run_shell_command,
    search_wikipedia,
    recall_memory,
]


def get_enabled_tools() -> list:
    """Return only enabled tools based on configuration."""
    from config.settings import (
        ENABLE_CODE_EXECUTION, ENABLE_FILE_OPS, ENABLE_WEB_SEARCH,
        ENABLE_IMAGE_GEN, ENABLE_SHELL
    )
    
    enabled = []
    tool_map = {
        "web_search": (web_search, ENABLE_WEB_SEARCH),
        "execute_python": (execute_python, ENABLE_CODE_EXECUTION),
        "read_file": (read_file, ENABLE_FILE_OPS),
        "write_file": (write_file, ENABLE_FILE_OPS),
        "list_directory": (list_directory, ENABLE_FILE_OPS),
        "gpu_status": (gpu_status, True),
        "generate_image": (generate_image, ENABLE_IMAGE_GEN),
        "run_shell_command": (run_shell_command, ENABLE_SHELL),
        "search_wikipedia": (search_wikipedia, ENABLE_WEB_SEARCH),
        "recall_memory": (recall_memory, True),
    }
    
    for name, (tool_func, is_enabled) in tool_map.items():
        if is_enabled:
            enabled.append(tool_func)
    
    return enabled
