import json
import os
import time
import uuid

import redis

from devin_orchestrator import load_config, run_devin


REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
STREAM = os.environ.get("DEVIN_STREAM", "devin:tasks")
GROUP = os.environ.get("DEVIN_GROUP", "devin-workers")
CONSUMER = os.environ.get("DEVIN_CONSUMER", f"c-{uuid.uuid4()}")


def result_key(run_id: str) -> str:
    return f"devin:result:{run_id}"


def ensure_group(r: redis.Redis) -> None:
    try:
        r.xgroup_create(name=STREAM, groupname=GROUP, id="0", mkstream=True)
    except Exception:
        pass


def main() -> None:
    r = redis.from_url(REDIS_URL, decode_responses=True)
    ensure_group(r)

    while True:
        items = r.xreadgroup(groupname=GROUP, consumername=CONSUMER, streams={STREAM: ">"}, count=1, block=5000)
        if not items:
            continue
        for stream_name, messages in items:
            for message_id, fields in messages:
                run_id = fields.get("run_id") or f"devin-{int(time.time())}-{uuid.uuid4()}"
                task = fields.get("task") or ""
                model = fields.get("model") or "fast"
                try:
                    cfg = load_config(model=model)
                    result = run_devin(cfg, task)
                    result["queued_run_id"] = run_id
                    r.set(result_key(run_id), json.dumps(result), ex=24 * 60 * 60)
                    r.xack(STREAM, GROUP, message_id)
                except Exception as e:
                    r.set(
                        result_key(run_id),
                        json.dumps({"run_id": run_id, "task": task, "error": type(e).__name__}),
                        ex=24 * 60 * 60,
                    )
                    r.xack(STREAM, GROUP, message_id)


if __name__ == "__main__":
    main()
