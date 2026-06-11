import json
from typing import Any, Dict, List

import requests


def plan_task(
    *,
    task: str,
    litellm_base_url: str,
    litellm_api_key: str,
    model: str = "fast",
) -> Dict[str, Any]:
    prompt = (
        "Eres un planner. Devuelve SOLO JSON válido.\n"
        'Esquema: {"goal": string, "steps": [string, ...]}\n'
        "Reglas: 3-6 pasos, concretos, accionables, sin código.\n"
        f"Tarea: {task}"
    )

    try:
        resp = requests.post(
            f"{litellm_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {litellm_api_key}"},
            json={
                "model": model,
                "temperature": 0.2,
                "messages": [
                    {"role": "system", "content": "Devuelve JSON estricto. Sin texto extra."},
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        steps = parsed.get("steps")
        if not isinstance(steps, list) or not steps:
            raise ValueError("Invalid plan steps")
        return {"goal": parsed.get("goal") or task, "steps": [str(s) for s in steps]}
    except Exception:
        return {"goal": task, "steps": ["analyze", "execute", "validate"]}
