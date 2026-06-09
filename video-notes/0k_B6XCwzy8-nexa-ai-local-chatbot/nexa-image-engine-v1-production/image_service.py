from typing import Any
import uuid

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


app = FastAPI(title="Nexa Image Engine v1", version="1.0.0")

COMFY_URL = "http://localhost:8188/prompt"


class ImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    style: str = "cinematic"
    width: int = 1024
    height: int = 1024


STYLE_PREFIX = {
    "cinematic": "cinematic, ultra realistic, dramatic lighting",
    "anime": "anime style, high detail, vibrant colors",
    "realistic": "photorealistic, 8k, ultra detail",
    "fantasy": "fantasy art, magical atmosphere",
}


def build_workflow(prompt: str, style: str) -> dict[str, Any]:
    style_prefix = STYLE_PREFIX.get(style, STYLE_PREFIX["cinematic"])
    full_prompt = f"{style_prefix}, {prompt}"

    # Ejemplo base. En producción real se reemplaza con un workflow JSON completo de ComfyUI.
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


@app.post("/generate")
def generate(req: ImageRequest) -> dict[str, Any]:
    workflow = build_workflow(req.prompt, req.style)
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
        "width": req.width,
        "height": req.height,
        "comfy_response": response.json(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("image_service:app", host="0.0.0.0", port=5003, reload=True)

