from __future__ import annotations

import os
from typing import Any

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


LITELLM_URL = os.environ.get(
    "AGENT_LOOP_LITELLM_URL", "http://127.0.0.1:4001/v1/chat/completions"
)
LITELLM_KEY = os.environ.get("AGENT_LOOP_LITELLM_KEY", "sk-local")
PLANNER_MODEL = os.environ.get("AGENT_LOOP_PLANNER_MODEL", "qwen-32b")
EXECUTOR_MODEL = os.environ.get("AGENT_LOOP_EXECUTOR_MODEL", "qwen-32b")
REQUEST_TIMEOUT_S = float(os.environ.get("AGENT_LOOP_TIMEOUT_S", "90"))
BASE_BEHAVIOR = (
    "Eres un agente determinista de Nexa. "
    "Responde siempre en espanol, de forma breve y clara, salvo que el usuario pida otro idioma. "
    "Si el usuario pide una salida literal corta, por ejemplo 'di ok', debes devolver exactamente eso y nada mas."
)

app = FastAPI(title="Nexa Agent Loop", version="1.0.0")


class AgentRequest(BaseModel):
    message: str


def _litellm_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {LITELLM_KEY}",
        "Content-Type": "application/json",
    }


def _call_litellm(model: str, messages: list[dict[str, str]]) -> dict[str, Any]:
    response = requests.post(
        LITELLM_URL,
        headers=_litellm_headers(),
        json={"model": model, "messages": messages},
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

    return data


def _extract_content(data: dict[str, Any]) -> str:
    try:
        return str(data["choices"][0]["message"]["content"]).strip()
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"respuesta_sin_choices_validos: {exc}"
        ) from exc


def planner(user_input: str) -> str:
    data = _call_litellm(
        PLANNER_MODEL,
        [
            {
                "role": "system",
                "content": (
                    f"{BASE_BEHAVIOR} "
                    "Actuas como planner. Devuelve un plan corto en pasos numerados. "
                    "Si la peticion es trivial o pide una salida literal corta, devuelve un solo paso indicando responder directamente."
                ),
            },
            {"role": "user", "content": user_input},
        ],
    )
    return _extract_content(data)


def executor(plan: str, user_input: str) -> str:
    data = _call_litellm(
        EXECUTOR_MODEL,
        [
            {
                "role": "system",
                "content": (
                    f"{BASE_BEHAVIOR} "
                    "Actuas como executor. Sigue el plan y responde al usuario con precision. "
                    "No agregues relleno ni cambies el idioma."
                ),
            },
            {"role": "user", "content": f"PLAN:\n{plan}\n\nUSER:\n{user_input}"},
        ],
    )
    return _extract_content(data)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "ok": "true",
        "litellm_url": LITELLM_URL,
        "planner_model": PLANNER_MODEL,
        "executor_model": EXECUTOR_MODEL,
    }


@app.post("/agent")
def agent(payload: AgentRequest) -> dict[str, str]:
    user_input = payload.message.strip()
    if not user_input:
        raise HTTPException(status_code=400, detail="message_requerido")

    plan = planner(user_input)
    result = executor(plan, user_input)

    return {
        "input": user_input,
        "plan": plan,
        "result": result,
    }
