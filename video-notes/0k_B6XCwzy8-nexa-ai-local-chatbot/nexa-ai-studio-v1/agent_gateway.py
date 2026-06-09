import requests


LLM = "http://localhost:4001/v1/chat/completions"
IMG = "http://localhost:5003/generate"
VID = "http://localhost:5004/generate-video"
VOICE = "http://localhost:5005/speak"


def route(request: dict) -> dict:
    text = request["input"].lower()

    if "imagen" in text or "foto" in text:
        return requests.post(IMG, json={"prompt": request["input"]}, timeout=30).json()

    if "video" in text:
        return requests.post(VID, json={"prompt": request["input"]}, timeout=30).json()

    if "voz" in text or "audio" in text:
        return requests.post(VOICE, json={"text": request["input"]}, timeout=30).json()

    return requests.post(
        LLM,
        json={
            "model": "qwen",
            "messages": [{"role": "user", "content": request["input"]}],
        },
        timeout=30,
    ).json()

