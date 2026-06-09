import uuid

import requests
from fastapi import FastAPI


app = FastAPI(title="Nexa Multi-Agent OS", version="1.0.0")

DIRECTOR = "http://localhost:5010/direct"
WRITER = "http://localhost:5011/write"
CAMERA = "http://localhost:5012/camera"
EDITOR = "http://localhost:5013/edit"


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/os/run")
def run_os(payload: dict) -> dict:
    job_id = str(uuid.uuid4())
    prompt = payload["prompt"]

    director = requests.post(DIRECTOR, json={"prompt": prompt}, timeout=30).json()
    script = requests.post(WRITER, json=director, timeout=30).json()
    shots = requests.post(CAMERA, json=script, timeout=30).json()
    final = requests.post(EDITOR, json=shots, timeout=30).json()

    return {
        "job_id": job_id,
        "status": "completed",
        "output": final,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("orchestrator:app", host="0.0.0.0", port=5007, reload=True)

