import requests


VIDEO_API = "http://localhost:5004/generate-video"


def handle_video_request(prompt: str, style: str = "cinematic", duration: int = 4, fps: int = 12) -> dict:
    payload = {
        "prompt": prompt,
        "style": style,
        "duration": duration,
        "fps": fps,
    }

    response = requests.post(VIDEO_API, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def route_intent(intent: str, prompt: str) -> dict:
    normalized = intent.lower()

    if "video" in normalized:
        return handle_video_request(prompt)
    if "image" in normalized:
        return {"status": "delegated", "target": "image-engine", "prompt": prompt}

    return {"status": "delegated", "target": "llm", "prompt": prompt}

