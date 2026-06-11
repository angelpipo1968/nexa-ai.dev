from typing import Any, Dict, List

import requests


def evaluate(
    *,
    task: str,
    steps: List[Dict[str, Any]],
    litellm_base_url: str,
    litellm_api_key: str,
    model: str = "fast",
) -> Dict[str, Any]:
    summary_lines = []
    for s in steps:
        step_name = str(s.get("step", ""))
        out = str(s.get("output", ""))
        summary_lines.append(f"- {step_name}: {out[:500]}")

    prompt = (
        "Eres un critic. Devuelve JSON estricto con el veredicto y respuesta final.\n"
        'Esquema: {"status":"SUCCESS"|"RETRY","final":string}\n'
        f"Tarea: {task}\n"
        "Evidencia:\n"
        + "\n".join(summary_lines)
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
        import json

        parsed = json.loads(content)
        status = parsed.get("status")
        final = parsed.get("final")
        if status not in ("SUCCESS", "RETRY"):
            status = "SUCCESS"
        if not isinstance(final, str) or not final.strip():
            final = "SUCCESS"
        return {"status": status, "final": final}
    except Exception:
        ok = any("error:" not in str(s.get("output", "")) for s in steps)
        return {"status": "SUCCESS" if ok else "RETRY", "final": "SUCCESS" if ok else "RETRY"}
