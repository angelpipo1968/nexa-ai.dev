from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

import redis
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


LITELLM_URL = os.environ.get(
    "AGENT_GATEWAY_V3_LITELLM_URL", "http://127.0.0.1:4001/v1/chat/completions"
)
LITELLM_KEY = os.environ.get("AGENT_GATEWAY_V3_LITELLM_KEY", "sk-local")
MODEL = os.environ.get("AGENT_GATEWAY_V3_MODEL", "qwen-32b")
REQUEST_TIMEOUT_S = float(os.environ.get("AGENT_GATEWAY_V3_TIMEOUT_S", "90"))
REDIS_HOST = os.environ.get("AGENT_GATEWAY_V3_REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.environ.get("AGENT_GATEWAY_V3_REDIS_PORT", "6379"))
REDIS_PREFIX = os.environ.get("AGENT_GATEWAY_V3_REDIS_PREFIX", "agent_gateway_v3")
BASE_BEHAVIOR = (
    "Eres un agente determinista de Nexa. "
    "Responde siempre en espanol, de forma breve y clara, salvo que el usuario pida otro idioma. "
    "Si el usuario pide una salida literal corta, por ejemplo 'di ok', devuelve exactamente esa salida y nada mas."
)

app = FastAPI(title="Nexa Agent Gateway v3", version="3.0.0")
_redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


class AgentRequest(BaseModel):
    user_id: str = "default"
    message: str


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {LITELLM_KEY}",
        "Content-Type": "application/json",
    }


def _memory_key(user_id: str) -> str:
    return f"{REDIS_PREFIX}:{user_id}"


def mem_get(user_id: str) -> Any:
    raw = _redis.get(_memory_key(user_id))
    return json.loads(raw) if raw else []


def mem_set(user_id: str, data: Any) -> None:
    _redis.set(_memory_key(user_id), json.dumps(data, ensure_ascii=False))


def _call_llm(system_prompt: str, user_content: str) -> str:
    response = requests.post(
        LITELLM_URL,
        headers=_headers(),
        json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
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


def planner(message: str) -> str:
    return _call_llm(
        (
            f"{BASE_BEHAVIOR} "
            "Actuas como planner. Devuelve solo pasos breves. "
            "Si la peticion es trivial o pide una salida literal corta, indica responder directamente."
        ),
        message,
    )


def executor(plan: str, message: str, memory: Any) -> str:
    content = f"PLAN:\n{plan}\n\nMEMORY:\n{json.dumps(memory, ensure_ascii=False)}\n\nINPUT:\n{message}"
    return _call_llm(
        f"{BASE_BEHAVIOR} Actuas como executor. Sigue el plan y responde con precision, sin relleno.",
        content,
    )


def critic(result: str) -> str:
    return _call_llm(
        (
            f"{BASE_BEHAVIOR} "
            "Actuas como critic. Mejora la respuesta manteniendola breve, correcta y coherente."
        ),
        result,
    )


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
    }


@app.post("/agent")
def agent(payload: AgentRequest) -> dict[str, str]:
    user_id = payload.user_id.strip() or "default"
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message_requerido")

    memory = mem_get(user_id)
    plan = planner(message)
    result = executor(plan, message, memory)
    final = critic(result)

    mem_set(
        user_id,
        {
            "last_message": message,
            "last_response": final,
            "last_plan": plan,
            "updated_at": _utc_now(),
        },
    )

    return {
        "plan": plan,
        "response": final,
    }
