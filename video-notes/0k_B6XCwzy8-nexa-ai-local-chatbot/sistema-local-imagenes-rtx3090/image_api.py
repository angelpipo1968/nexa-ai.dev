from typing import Any

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


app = FastAPI(title="Nexa Image API", version="1.0.0")

COMFY_PROMPT_URL = "http://localhost:8188/prompt"


class GenerateImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Prompt de imagen")
    negative_prompt: str | None = Field(default=None, description="Prompt negativo opcional")
    style: str | None = Field(default=None, description="Estilo opcional: cinematic, anime, realistic")


def build_basic_comfy_payload(prompt: str, negative_prompt: str | None = None) -> dict[str, Any]:
    # Payload base de ejemplo. Normalmente se adapta al workflow JSON real de ComfyUI.
    return {
        "prompt": {
            "3": {
                "inputs": {
                    "text": prompt,
                    "clip": ["4", 1],
                },
                "class_type": "CLIPTextEncode",
            },
            "4": {
                "inputs": {
                    "ckpt_name": "juggernautXL.safetensors",
                },
                "class_type": "CheckpointLoaderSimple",
            },
            "5": {
                "inputs": {
                    "text": negative_prompt or "",
                    "clip": ["4", 1],
                },
                "class_type": "CLIPTextEncode",
            },
        }
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/generate")
def generate_image(body: GenerateImageRequest) -> dict[str, Any]:
    payload = build_basic_comfy_payload(body.prompt, body.negative_prompt)

    try:
        response = requests.post(COMFY_PROMPT_URL, json=payload, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Error hablando con ComfyUI: {exc}") from exc

    return {
        "ok": True,
        "style": body.style,
        "comfy_response": response.json(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("image_api:app", host="0.0.0.0", port=5003, reload=True)

