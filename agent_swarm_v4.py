from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


LITELLM_URL = os.environ.get(
    "AGENT_SWARM_V4_LITELLM_URL", "http://127.0.0.1:4001/v1/chat/completions"
)
LITELLM_KEY = os.environ.get("AGENT_SWARM_V4_LITELLM_KEY", "sk-local")
MODEL = os.environ.get("AGENT_SWARM_V4_MODEL", "qwen-32b")
REQUEST_TIMEOUT_S = float(os.environ.get("AGENT_SWARM_V4_TIMEOUT_S", "120"))
BASE_BEHAVIOR = (
    "Eres un agente determinista de Nexa. "
    "Responde siempre en espanol, de forma breve y clara, salvo que el usuario pida otro idioma. "
    "Si el usuario pide una salida literal corta, por ejemplo 'di ok', devuelve exactamente esa salida y nada mas."
)

app = FastAPI(title="Nexa Agent Swarm v4", version="4.0.0")


class AgentRequest(BaseModel):
    message: str


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {LITELLM_KEY}",
        "Content-Type": "application/json",
    }


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
            "Actuas como planner de swarm. Divide la tarea en 3 subtareas breves. "
            "Si la peticion es trivial o pide una salida literal corta, indica responder directamente."
        ),
        message,
    )


def agent(role: str, task: str) -> str:
    return _call_llm(
        f"{BASE_BEHAVIOR} Actuas como {role}. Resuelve tu parte con precision y sin relleno.",
        task,
    )


def run_swarm(tasks: str) -> dict[str, str]:
    jobs = {
        "reasoning": "reasoning agent",
        "coding": "coding agent",
        "analysis": "analysis agent",
    }
    out: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=3) as pool:
        future_map = {
            pool.submit(agent, role_prompt, tasks): role_name
            for role_name, role_prompt in jobs.items()
        }
        for future in as_completed(future_map):
            role_name = future_map[future]
            out[role_name] = future.result()
    return out


def aggregator(results: dict[str, str]) -> str:
    ordered = []
    for key in ("reasoning", "coding", "analysis"):
        if key in results:
            ordered.append(f"{key.upper()}:\n{results[key]}")
    return "\n\n".join(ordered)


def critic(text: str) -> str:
    return _call_llm(
        f"{BASE_BEHAVIOR} Actuas como critic final. Integra y mejora la respuesta final sin alargarla.",
        text,
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "litellm_url": LITELLM_URL,
        "model": MODEL,
        "roles": ["reasoning", "coding", "analysis"],
    }


@app.post("/agent")
def run_agent(payload: AgentRequest) -> dict[str, Any]:
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message_requerido")

    plan = planner(message)
    swarm_results = run_swarm(plan)
    combined = aggregator(swarm_results)
    final = critic(combined)

    return {
        "plan": plan,
        "swarm": swarm_results,
        "final": final,
    }
