from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from typing import Any, Callable

import redis
import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


LITELLM_URL = os.environ.get(
    "AGENT_LOOP_LITELLM_URL", "http://127.0.0.1:4001/v1/chat/completions"
)
LITELLM_KEY = os.environ.get("AGENT_LOOP_LITELLM_KEY", "sk-local")
MODEL = os.environ.get("AGENT_LOOP_MODEL", "qwen-32b")
REQUEST_TIMEOUT_S = float(os.environ.get("AGENT_LOOP_TIMEOUT_S", "90"))
REDIS_HOST = os.environ.get("AGENT_LOOP_REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.environ.get("AGENT_LOOP_REDIS_PORT", "6379"))
BASE_BEHAVIOR = (
    "Eres un agente determinista de Nexa. "
    "Responde siempre en espanol, de forma breve y clara, salvo que el usuario pida otro idioma. "
    "Si el usuario pide una salida literal corta, por ejemplo 'di ok', devuelve exactamente esa salida y nada mas."
)

app = FastAPI(title="Nexa Agent Loop v2", version="2.0.0")
_redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

ToolFn = Callable[[str], str]
TOOLS: dict[str, ToolFn] = {}


class AgentRequest(BaseModel):
    message: str
    user_id: str = "default"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {LITELLM_KEY}",
        "Content-Type": "application/json",
    }


def _call_llm(system: str, user_input: str) -> str:
    response = requests.post(
        LITELLM_URL,
        headers=_headers(),
        json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_input},
            ],
        },
        timeout=REQUEST_TIMEOUT_S,
    )
    try:
        data = response.json()
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"respuesta_invalida_desde_litellm: {exc}"
        ) from exc

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=data)

    try:
        return str(data["choices"][0]["message"]["content"]).strip()
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"respuesta_sin_choices_validos: {exc}"
        ) from exc


def _redis_get_json(key: str) -> Any:
    raw = _redis.get(key)
    return json.loads(raw) if raw else None


def _redis_set_json(key: str, value: Any) -> None:
    _redis.set(key, json.dumps(value, ensure_ascii=False))


def save_memory(user_id: str, key: str, value: Any) -> None:
    _redis_set_json(f"{user_id}:{key}", value)


def get_memory(user_id: str, key: str) -> Any:
    return _redis_get_json(f"{user_id}:{key}")


def register_tool(name: str, fn: ToolFn) -> None:
    TOOLS[name] = fn


def _tool_gpu_status(_: str) -> str:
    commands = [
        ["nvidia-smi", "--query-gpu=name,memory.used,memory.total", "--format=csv,noheader"],
        [
            "docker",
            "run",
            "--rm",
            "--gpus",
            "all",
            "nvidia/cuda:12.4.1-base-ubuntu22.04",
            "nvidia-smi",
            "--query-gpu=name,memory.used,memory.total",
            "--format=csv,noheader",
        ],
    ]
    for cmd in commands:
        try:
            out = subprocess.check_output(cmd, text=True, timeout=20).strip()
            if out:
                return out
        except Exception:
            continue
    return "gpu_status_no_disponible"


def _tool_system_status(_: str) -> str:
    parts: list[str] = []
    for url in (
        "http://127.0.0.1:8002/v1/models",
        "http://127.0.0.1:4001/v1/models",
        "http://127.0.0.1:5000/health",
        "http://127.0.0.1:8001/docs",
    ):
        try:
            r = requests.get(url, timeout=5)
            parts.append(f"{url}={r.status_code}")
        except Exception:
            parts.append(f"{url}=down")
    return " | ".join(parts)


def _tool_router_models(_: str) -> str:
    try:
        r = requests.get(
            "http://127.0.0.1:4001/v1/models",
            headers={"Authorization": f"Bearer {LITELLM_KEY}"},
            timeout=10,
        )
        data = r.json()
        models = [item.get("id", "") for item in data.get("data", [])]
        return ", ".join(m for m in models if m) or "sin_modelos"
    except Exception as exc:
        return f"router_models_error: {exc}"


register_tool("gpu_status", _tool_gpu_status)
register_tool("system_status", _tool_system_status)
register_tool("router_models", _tool_router_models)


def tools_router(text: str) -> dict[str, str] | None:
    lower = text.lower()
    if "gpu" in lower or "vram" in lower:
        return {"tool": "gpu_status", "result": TOOLS["gpu_status"](text)}
    if "router" in lower or "modelo" in lower or "models" in lower:
        return {"tool": "router_models", "result": TOOLS["router_models"](text)}
    if "sistema" in lower or "status" in lower or "estado" in lower:
        return {"tool": "system_status", "result": TOOLS["system_status"](text)}
    return None


def planner(user_input: str, memory: Any) -> str:
    return _call_llm(
        (
            f"{BASE_BEHAVIOR} "
            "Actuas como planner. Devuelve solo pasos numerados y cortos. "
            "Si la peticion es trivial o pide una salida literal corta, indica responder directamente."
        ),
        f"MEMORY:\n{json.dumps(memory, ensure_ascii=False)}\n\nUSER:\n{user_input}",
    )


def executor(plan: str, user_input: str, memory: Any) -> str:
    tool_data = tools_router(user_input)
    context = (
        f"MEMORY:\n{json.dumps(memory, ensure_ascii=False)}\n\n"
        f"PLAN:\n{plan}\n\n"
        f"USER:\n{user_input}\n\n"
        f"TOOL RESULT:\n{json.dumps(tool_data, ensure_ascii=False)}"
    )
    return _call_llm(
        (
            f"{BASE_BEHAVIOR} "
            "Actuas como executor. Usa memoria y herramientas cuando existan, y responde con precision y sin relleno."
        ),
        context,
    )


def critic(result: str) -> str:
    return _call_llm(
        (
            f"{BASE_BEHAVIOR} "
            "Actuas como critic. Mejora claridad, exactitud y concision sin cambiar la intencion ni agregar contenido innecesario."
        ),
        result,
    )


def stream_response(text: str):
    for word in text.split():
        yield word + " "


@app.get("/health")
def health() -> dict[str, Any]:
    redis_ok = True
    try:
        _redis.ping()
    except Exception:
        redis_ok = False
    return {
        "ok": True,
        "time": _utc_now(),
        "litellm_url": LITELLM_URL,
        "model": MODEL,
        "redis": redis_ok,
        "tools": sorted(TOOLS.keys()),
    }


@app.post("/agent")
def agent(payload: AgentRequest) -> dict[str, Any]:
    user_input = payload.message.strip()
    if not user_input:
        raise HTTPException(status_code=400, detail="message_requerido")

    memory = get_memory(payload.user_id, "context")
    plan = planner(user_input, memory)
    result = executor(plan, user_input, memory)
    final = critic(result)

    save_memory(
        payload.user_id,
        "context",
        {
            "last_input": user_input,
            "last_plan": plan,
            "last_output": final,
            "updated_at": _utc_now(),
        },
    )

    return {
        "user_id": payload.user_id,
        "plan": plan,
        "result": final,
        "memory_loaded": memory,
        "tool_result": tools_router(user_input),
    }


@app.post("/agent/stream")
def agent_stream(payload: AgentRequest) -> StreamingResponse:
    user_input = payload.message.strip()
    if not user_input:
        raise HTTPException(status_code=400, detail="message_requerido")

    memory = get_memory(payload.user_id, "context")
    plan = planner(user_input, memory)
    result = executor(plan, user_input, memory)
    final = critic(result)

    save_memory(
        payload.user_id,
        "context",
        {
            "last_input": user_input,
            "last_plan": plan,
            "last_output": final,
            "updated_at": _utc_now(),
        },
    )

    return StreamingResponse(stream_response(final), media_type="text/plain; charset=utf-8")
