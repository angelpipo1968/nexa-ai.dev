import json
import os
import time
import uuid
from typing import Any, Dict, Optional

import redis
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from coder import execute_step
from critic import evaluate
from devin_orchestrator import load_config, run_devin
from planner import plan_task


REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
LITELLM_BASE_URL = os.environ.get("LITELLM_BASE_URL", "http://litellm:4000/v1")
LITELLM_API_KEY = os.environ.get("LITELLM_API_KEY", "")
DEVIN_STREAM = os.environ.get("DEVIN_STREAM", "devin:tasks")

redis_client = redis.from_url(REDIS_URL, decode_responses=True)

app = FastAPI(title="Swarm API v1", version="1.0.0")


class SwarmRunRequest(BaseModel):
    task: str = Field(min_length=1)
    model: str = Field(default="fast")
    max_steps: int = Field(default=6, ge=1, le=12)


class SwarmRunResponse(BaseModel):
    task_id: str
    task: str
    plan: Dict[str, Any]
    steps: list[Dict[str, Any]]
    verdict: Dict[str, Any]

class DevinRunRequest(BaseModel):
    task: str = Field(min_length=1)
    model: str = Field(default="fast")


class DevinSubmitResponse(BaseModel):
    run_id: str
    status: str

def _key(task_id: str) -> str:
    return f"swarm:task:{task_id}"

def _devin_result_key(run_id: str) -> str:
    return f"devin:result:{run_id}"


@app.get("/health")
def health() -> Dict[str, Any]:
    try:
        redis_client.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return {"status": "ok", "redis": redis_ok}


@app.post("/run", response_model=SwarmRunResponse)
def run(req: SwarmRunRequest) -> SwarmRunResponse:
    if not LITELLM_API_KEY:
        raise HTTPException(status_code=500, detail="LITELLM_API_KEY is not set")

    task_id = f"t-{int(time.time())}-{uuid.uuid4()}"
    started_at = int(time.time())

    plan = plan_task(
        task=req.task,
        litellm_base_url=LITELLM_BASE_URL,
        litellm_api_key=LITELLM_API_KEY,
        model=req.model,
    )
    steps = []
    for step in plan.get("steps", [])[: req.max_steps]:
        steps.append(
            execute_step(
                task=req.task,
                step=str(step),
                litellm_base_url=LITELLM_BASE_URL,
                litellm_api_key=LITELLM_API_KEY,
                model=req.model,
            )
        )

    verdict = evaluate(
        task=req.task,
        steps=steps,
        litellm_base_url=LITELLM_BASE_URL,
        litellm_api_key=LITELLM_API_KEY,
        model=req.model,
    )

    payload = {
        "task_id": task_id,
        "task": req.task,
        "plan": plan,
        "steps": steps,
        "verdict": verdict,
        "started_at": started_at,
        "finished_at": int(time.time()),
    }
    redis_client.set(_key(task_id), json.dumps(payload), ex=24 * 60 * 60)

    return SwarmRunResponse(task_id=task_id, task=req.task, plan=plan, steps=steps, verdict=verdict)

@app.post("/v3/run")
def v3_run(req: DevinRunRequest) -> Dict[str, Any]:
    if not LITELLM_API_KEY:
        raise HTTPException(status_code=500, detail="LITELLM_API_KEY is not set")
    cfg = load_config(model=req.model)
    return run_devin(cfg, req.task)


@app.post("/v3/submit", response_model=DevinSubmitResponse)
def v3_submit(req: DevinRunRequest) -> DevinSubmitResponse:
    run_id = f"q-{int(time.time())}-{uuid.uuid4()}"
    redis_client.xadd(DEVIN_STREAM, {"run_id": run_id, "task": req.task, "model": req.model})
    return DevinSubmitResponse(run_id=run_id, status="queued")


@app.get("/v3/status/{run_id}")
def v3_status(run_id: str) -> Dict[str, Any]:
    raw = redis_client.get(_devin_result_key(run_id))
    if not raw:
        raise HTTPException(status_code=404, detail="run_not_found")
    return json.loads(raw)


@app.get("/status/{task_id}")
def status(task_id: str) -> Dict[str, Any]:
    raw = redis_client.get(_key(task_id))
    if not raw:
        raise HTTPException(status_code=404, detail="task_not_found")
    return json.loads(raw)
