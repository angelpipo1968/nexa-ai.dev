"""
NEXA OS — AI Proxy Gateway
Proxy seguro que enruta peticiones a proveedores de AI.
Las API keys NUNCA salen del servidor.
"""

import os
import time
import logging
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field
import httpx

logger = logging.getLogger("NEXA-AI-PROXY")

router = APIRouter(prefix="/api/ai", tags=["AI Gateway"])

# ══════════════════════════════════════════
# Modelos de Request/Response
# ══════════════════════════════════════════

class ChatMessage(BaseModel):
    role: str = "user"
    content: str

class AIChatRequest(BaseModel):
    messages: List[ChatMessage]
    provider: Optional[str] = None  # auto, gemini, groq, ollama, nvidia, deepseek, anthropic, xiaomi
    model: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=4096, ge=1, le=32768)
    stream: bool = False
    reasoning_mode: Optional[str] = None  # normal, deep
    agent: Optional[str] = None  # Architect, Researcher, Security, Visionary

class AIResponse(BaseModel):
    response: str
    provider: str
    model: str
    tokens_used: int = 0
    latency_ms: float = 0
    fallback_used: bool = False

# ══════════════════════════════════════════
# Configuración de Proveedores
# ══════════════════════════════════════════

PROVIDER_CONFIGS = {
    "gemini": {
        "url": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        "key_env": "GEMINI_API_KEY",
        "default_model": "gemini-1.5-flash",
    },
    "groq": {
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "key_env": "GROQ_API_KEY",
        "default_model": "llama-3.3-70b-versatile",
    },
    "nvidia": {
        "url": "https://integrate.api.nvidia.com/v1/chat/completions",
        "key_env": "NVIDIA_API_KEY",
        "default_model": "meta/llama-3.1-405b-instruct",
    },
    "deepseek": {
        "url": "https://api.deepseek.com/chat/completions",
        "key_env": "DEEPSEEK_API_KEY",
        "default_model": "deepseek-chat",
    },
    "anthropic": {
        "url": "https://api.anthropic.com/v1/messages",
        "key_env": "ANTHROPIC_API_KEY",
        "default_model": "claude-3-5-sonnet-20240620",
    },
    "openai": {
        "url": "https://api.openai.com/v1/chat/completions",
        "key_env": "OPENAI_API_KEY",
        "default_model": "gpt-4o-mini",
    },
    "xiaomi": {
        "url": "https://platform.xiaomimimo.com/v1/chat/completions",
        "key_env": "VITE_XIAOMI_API_KEY",
        "default_model": "MiMo-V2.5-Pro",
    },
}

# Orden de fallback: prioridad de proveedores
FALLBACK_ORDER = ["xiaomi", "ollama", "gemini", "groq", "nvidia", "deepseek", "anthropic", "openai"]

NEXA_SYSTEM_PROMPT = """Eres Nexa, una inteligencia artificial de vanguardia impulsada por el motor MiMo-V2.5-Pro (1T MoE). 
Tu objetivo es ser el asistente definitivo para ingeniería de software, razonamiento complejo y tareas de largo horizonte.
Responde de forma clara, precisa y en español. 
Usa markdown cuando sea apropiado para formatear tus respuestas."""

# ══════════════════════════════════════════
# Funciones de Llamada a Proveedores
# ══════════════════════════════════════════

async def _call_ollama(messages: List[Dict], model: str, temperature: float, max_tokens: int) -> Dict:
    """Llama a Ollama local o remoto."""
    ollama_url = os.getenv("OLLAMA_HOST_URL", "http://127.0.0.1:11434")
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{ollama_url}/api/chat", json={
            "model": model or "nexa-os",
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature}
        })
        resp.raise_for_status()
        data = resp.json()
        return {
            "response": data.get("message", {}).get("content", ""),
            "tokens": data.get("eval_count", 0) + data.get("prompt_eval_count", 0),
            "model": model or "nexa-os"
        }


async def _call_gemini(messages: List[Dict], model: str, temperature: float, max_tokens: int) -> Dict:
    """Llama a Google Gemini."""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise ValueError("GEMINI_API_KEY no configurada")

    # Convertir mensajes al formato Gemini
    gemini_messages = []
    system_text = NEXA_SYSTEM_PROMPT
    for msg in messages:
        if msg["role"] == "system":
            system_text = msg["content"]
            continue
        gemini_messages.append({
            "role": "model" if msg["role"] == "assistant" else "user",
            "parts": [{"text": msg["content"]}]
        })

    model_name = model or "gemini-1.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json={
            "system_instruction": {"parts": [{"text": system_text}]},
            "contents": gemini_messages,
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens}
        })
        resp.raise_for_status()
        data = resp.json()
        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        tokens = data.get("usageMetadata", {}).get("totalTokenCount", 0)
        return {"response": text, "tokens": tokens, "model": model_name}


async def _call_openai_compatible(
    url: str, key: str, messages: List[Dict], model: str,
    temperature: float, max_tokens: int, extra_headers: Dict = None
) -> Dict:
    """Llama a cualquier API compatible con OpenAI (Groq, NVIDIA, DeepSeek, OpenAI)."""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}"
    }
    if extra_headers:
        headers.update(extra_headers)

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, headers=headers, json={
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        })
        resp.raise_for_status()
        data = resp.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        tokens = data.get("usage", {}).get("total_tokens", 0)
        return {"response": text, "tokens": tokens, "model": model}


async def _call_anthropic(messages: List[Dict], model: str, temperature: float, max_tokens: int) -> Dict:
    """Llama a Anthropic Claude."""
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise ValueError("ANTHROPIC_API_KEY no configurada")

    # Separar system prompt de los mensajes
    system_text = NEXA_SYSTEM_PROMPT
    filtered = []
    for msg in messages:
        if msg["role"] == "system":
            system_text = msg["content"]
        else:
            filtered.append(msg)

    model_name = model or "claude-3-5-sonnet-20240620"
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post("https://api.anthropic.com/v1/messages", headers={
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01"
        }, json={
            "model": model_name,
            "max_tokens": max_tokens,
            "system": system_text,
            "messages": filtered,
            "temperature": temperature
        })
        resp.raise_for_status()
        data = resp.json()
        text = data.get("content", [{}])[0].get("text", "")
        tokens = data.get("usage", {}).get("input_tokens", 0) + data.get("usage", {}).get("output_tokens", 0)
        return {"response": text, "tokens": tokens, "model": model_name}


async def call_provider(provider: str, messages: List[Dict], model: str, temperature: float, max_tokens: int) -> Dict:
    """Router central que dirige la llamada al proveedor correcto."""
    if provider == "ollama":
        return await _call_ollama(messages, model, temperature, max_tokens)
    elif provider == "gemini":
        return await _call_gemini(messages, model, temperature, max_tokens)
    elif provider == "anthropic":
        return await _call_anthropic(messages, model, temperature, max_tokens)
    elif provider in ("groq", "nvidia", "deepseek", "openai", "xiaomi"):
        config = PROVIDER_CONFIGS[provider]
        key = os.getenv(config["key_env"])
        if not key:
            raise ValueError(f"{config['key_env']} no configurada")
        return await _call_openai_compatible(
            url=config["url"],
            key=key,
            messages=messages,
            model=model or config["default_model"],
            temperature=temperature,
            max_tokens=max_tokens
        )
    else:
        raise ValueError(f"Proveedor desconocido: {provider}")


# ══════════════════════════════════════════
# Endpoints
# ══════════════════════════════════════════

@router.post("/chat", response_model=AIResponse)
async def ai_chat(req: AIChatRequest, request: Request):
    """
    Endpoint principal de chat con AI.
    Soporta selección de proveedor o fallback automático.
    """
    start = time.time()
    messages_raw = [{"role": m.role, "content": m.content} for m in req.messages]

    # Inyectar system prompt si no está presente
    if not any(m["role"] == "system" for m in messages_raw):
        messages_raw.insert(0, {"role": "system", "content": NEXA_SYSTEM_PROMPT})

    errors = []

    # Si se especifica un proveedor, intentar solo ese
    if req.provider and req.provider != "auto":
        try:
            result = await call_provider(
                provider=req.provider,
                messages=messages_raw,
                model=req.model,
                temperature=req.temperature,
                max_tokens=req.max_tokens
            )
            latency = (time.time() - start) * 1000

            # Registrar métricas
            try:
                from nexa_agente.middleware.telemetry import metrics
                metrics.record_ai_call(req.provider, latency, result.get("tokens", 0), True)
            except Exception:
                pass

            return AIResponse(
                response=result["response"],
                provider=req.provider,
                model=result.get("model", "unknown"),
                tokens_used=result.get("tokens", 0),
                latency_ms=round(latency, 1),
                fallback_used=False
            )
        except Exception as e:
            logger.error(f"❌ [{req.provider}] Error: {e}")
            errors.append(f"{req.provider}: {str(e)}")

    # Fallback automático: intentar cada proveedor en orden
    for provider in FALLBACK_ORDER:
        # Verificar si el proveedor tiene key configurada (excepto ollama)
        if provider != "ollama":
            config = PROVIDER_CONFIGS.get(provider, {})
            key_env = config.get("key_env", "")
            if key_env and not os.getenv(key_env):
                continue  # Skip si no tiene key

        try:
            result = await call_provider(
                provider=provider,
                messages=messages_raw,
                model=req.model,
                temperature=req.temperature,
                max_tokens=req.max_tokens
            )
            latency = (time.time() - start) * 1000

            # Registrar métricas
            try:
                from nexa_agente.middleware.telemetry import metrics
                metrics.record_ai_call(provider, latency, result.get("tokens", 0), True)
            except Exception:
                pass

            is_fallback = provider != FALLBACK_ORDER[0]
            if is_fallback:
                logger.info(f"🔄 [FALLBACK] Usando {provider} como respaldo")

            return AIResponse(
                response=result["response"],
                provider=provider,
                model=result.get("model", "unknown"),
                tokens_used=result.get("tokens", 0),
                latency_ms=round(latency, 1),
                fallback_used=is_fallback
            )

        except Exception as e:
            logger.warning(f"⚠️ [{provider}] Falló: {e}")
            errors.append(f"{provider}: {str(e)}")

            # Registrar error
            try:
                from nexa_agente.middleware.telemetry import metrics
                metrics.record_ai_call(provider, (time.time() - start) * 1000, 0, False)
            except Exception:
                pass

    # Todos los proveedores fallaron
    logger.error(f"💀 [AI-PROXY] Todos los proveedores fallaron: {errors}")
    raise HTTPException(
        status_code=503,
        detail={
            "error": "Sin conectividad AI",
            "message": "Todos los proveedores de AI están inaccesibles.",
            "providers_tried": errors
        }
    )


@router.get("/providers")
async def list_providers():
    """Lista los proveedores disponibles y su estado."""
    available = {}
    for name, config in PROVIDER_CONFIGS.items():
        key = os.getenv(config.get("key_env", ""))
        available[name] = {
            "configured": bool(key),
            "model": config["default_model"],
        }

    # Ollama
    ollama_url = os.getenv("OLLAMA_HOST_URL", "http://127.0.0.1:11434")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{ollama_url}/api/tags")
            available["ollama"] = {"configured": resp.status_code == 200, "model": "nexa-os", "url": ollama_url}
    except Exception:
        available["ollama"] = {"configured": False, "model": "nexa-os", "url": ollama_url}

    return {"providers": available, "fallback_order": FALLBACK_ORDER}
