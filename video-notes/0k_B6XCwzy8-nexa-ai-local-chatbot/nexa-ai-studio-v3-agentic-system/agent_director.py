import json
import uuid

import requests
from fastapi import FastAPI


app = FastAPI(title="Nexa AI Director", version="1.0.0")

IMG = "http://localhost:5003/generate"
VID = "http://localhost:5004/generate-video"
VOICE = "http://localhost:5005/speak"
LLM = "http://localhost:4001/v1/chat/completions"


def plan(prompt: str) -> dict:
    response = requests.post(
        LLM,
        json={
            "model": "qwen",
            "messages": [
                {
                    "role": "system",
                    "content": "Eres un director de producción audiovisual. Devuelve JSON con: image, video, voice, scene_description",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/agent/run")
def run_agent(payload: dict) -> dict:
    job_id = str(uuid.uuid4())
    user_prompt = payload["prompt"]

    plan_result = plan(user_prompt)

    try:
        content = plan_result["choices"][0]["message"]["content"]
    except Exception:
        content = "{}"

    try:
        plan_json = json.loads(content)
    except Exception:
        plan_json = {
            "image": True,
            "video": False,
            "voice": False,
            "scene_description": user_prompt,
        }

    result = {
        "job_id": job_id,
        "plan": plan_json,
        "status": "executing",
    }

    scene_description = plan_json.get("scene_description", user_prompt)

    if plan_json.get("image"):
        result["image"] = requests.post(IMG, json={"prompt": scene_description}, timeout=30).json()

    if plan_json.get("video"):
        result["video"] = requests.post(
            VID,
            json={"prompt": scene_description, "style": "cinematic"},
            timeout=30,
        ).json()

    if plan_json.get("voice"):
        result["voice"] = requests.post(VOICE, json={"text": scene_description}, timeout=30).json()

    result["status"] = "completed"
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("agent_director:app", host="0.0.0.0", port=5007, reload=True)

