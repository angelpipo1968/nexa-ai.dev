from typing import Any, Dict

import requests


def execute_step(
    *,
    task: str,
    step: str,
    litellm_base_url: str,
    litellm_api_key: str,
    model: str = "fast",
) -> Dict[str, Any]:
    prompt = (
        "Eres un coder/executor, pero NO ejecutes comandos ni escribas archivos.\n"
        "Devuelve una salida concisa del resultado del paso.\n"
        f"Tarea: {task}\n"
        f"Paso: {step}"
    )

    try:
        resp = requests.post(
            f"{litellm_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {litellm_api_key}"},
            json={
                "model": model,
                "temperature": 0.3,
                "messages": [
                    {"role": "system", "content": "Responde en texto plano, conciso."},
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return {"step": step, "output": content}
    except Exception as e:
        return {"step": step, "output": f"error: {type(e).__name__}"}
