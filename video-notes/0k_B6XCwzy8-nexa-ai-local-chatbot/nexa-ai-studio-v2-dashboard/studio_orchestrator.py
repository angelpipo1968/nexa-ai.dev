import uuid

import requests
from fastapi import FastAPI


app = FastAPI(title="Nexa AI Studio Orchestrator", version="1.0.0")

IMG = "http://localhost:5003/generate"
VID = "http://localhost:5004/generate-video"
VOICE = "http://localhost:5005/speak"


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/studio/run")
def run_studio(payload: dict) -> dict:
    job_id = str(uuid.uuid4())
    prompt = payload["prompt"]

    result = {
        "job_id": job_id,
        "status": "processing",
    }

    if payload.get("image"):
        img = requests.post(
            IMG,
            json={
                "prompt": prompt,
                "style": payload.get("style", "cinematic"),
            },
            timeout=30,
        ).json()
        result["image"] = img

    if payload.get("video"):
        vid = requests.post(
            VID,
            json={
                "prompt": prompt,
                "style": payload.get("style", "cinematic"),
                "duration": payload.get("duration", 4),
            },
            timeout=30,
        ).json()
        result["video"] = vid

    if payload.get("voice"):
        voice = requests.post(
            VOICE,
            json={
                "text": prompt,
            },
            timeout=30,
        ).json()
        result["voice"] = voice

    result["status"] = "queued"
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("studio_orchestrator:app", host="0.0.0.0", port=5006, reload=True)

