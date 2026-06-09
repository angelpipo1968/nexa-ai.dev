from typing import Any
import uuid

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


app = FastAPI(title="Nexa Video AI Engine v1", version="1.0.0")

COMFY_URL = "http://localhost:8188/prompt"


class VideoRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    duration: int = 4
    fps: int = 12
    style: str = "cinematic"


STYLE_MAP = {
    "cinematic": "cinematic lighting, film look, ultra realistic",
    "anime": "anime style, smooth motion",
    "realistic": "real world, handheld camera",
}


def build_video_workflow(prompt: str, style: str) -> dict[str, Any]:
    full_prompt = f"{STYLE_MAP.get(style, STYLE_MAP['cinematic'])}, {prompt}"

    # Ejemplo base. Para producción real se cambia por un workflow JSON de AnimateDiff o SVD.
    return {
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": full_prompt,
            },
        }
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/generate-video")
def generate_video(req: VideoRequest) -> dict[str, Any]:
    workflow = build_video_workflow(req.prompt, req.style)
    payload = {
        "prompt": workflow,
        "client_id": str(uuid.uuid4()),
    }

    try:
        response = requests.post(COMFY_URL, json=payload, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Error con ComfyUI: {exc}") from exc

    return {
        "status": "queued",
        "prompt": req.prompt,
        "style": req.style,
        "duration": req.duration,
        "fps": req.fps,
        "comfy": response.json(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("video_service:app", host="0.0.0.0", port=5004, reload=True)

