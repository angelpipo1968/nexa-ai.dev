import requests


IMAGE_API = "http://localhost:5003/generate"


def handle_image_request(user_prompt: str, style: str = "cinematic") -> dict:
    payload = {
        "prompt": user_prompt,
        "style": style,
    }

    response = requests.post(IMAGE_API, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def route_message(message_type: str, message: str) -> dict:
    if message_type == "image":
        return handle_image_request(message)

    return {
        "status": "delegated",
        "target": "llm",
        "message": message,
    }

