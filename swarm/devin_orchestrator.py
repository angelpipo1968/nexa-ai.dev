import json
import os
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests

from devin_memory import get_memory
from devin_tools import git_diff, git_status, list_files, read_text, run_tests, write_text


@dataclass(frozen=True)
class OrchestratorConfig:
    litellm_base_url: str
    litellm_api_key: str
    workspace_dir: str
    model: str = "fast"
    max_fix_loops: int = 2


def _chat(
    *,
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float = 0.2,
    timeout_s: int = 120,
) -> str:
    r = requests.post(
        f"{base_url.rstrip('/')}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"model": model, "temperature": temperature, "messages": messages},
        timeout=timeout_s,
    )
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"]


def plan_graph(cfg: OrchestratorConfig, task: str) -> Dict[str, Any]:
    prompt = (
        "Devuelve SOLO JSON válido.\n"
        'Esquema: {"goal": string, "graph":[{"id":string,"type":string}]}\n'
        "Los tipos permitidos: setup_repo, write_code, run_tests, fix_errors, finalize.\n"
        "Incluye siempre esos tipos, en ese orden.\n"
        f"Tarea: {task}"
    )
    try:
        content = _chat(
            base_url=cfg.litellm_base_url,
            api_key=cfg.litellm_api_key,
            model=cfg.model,
            temperature=0.1,
            messages=[
                {"role": "system", "content": "JSON estricto. Sin texto extra."},
                {"role": "user", "content": prompt},
            ],
            timeout_s=60,
        )
        parsed = json.loads(content)
        graph = parsed.get("graph")
        if not isinstance(graph, list) or not graph:
            raise ValueError("bad_graph")
        return {"goal": parsed.get("goal") or task, "graph": graph}
    except Exception:
        return {
            "goal": task,
            "graph": [
                {"id": "1", "type": "setup_repo"},
                {"id": "2", "type": "write_code"},
                {"id": "3", "type": "run_tests"},
                {"id": "4", "type": "fix_errors"},
                {"id": "5", "type": "finalize"},
            ],
        }


def _repo_snapshot(cfg: OrchestratorConfig, max_files: int = 400) -> Dict[str, Any]:
    files = list_files(cfg.workspace_dir, max_files=max_files)
    return {"files": files[:max_files]}


def _apply_file_ops(cfg: OrchestratorConfig, ops: List[Dict[str, Any]]) -> List[str]:
    changed: List[str] = []
    for op in ops:
        path = str(op.get("path", "")).strip()
        content = op.get("content")
        if not path or not isinstance(content, str):
            continue
        write_text(cfg.workspace_dir, path, content)
        changed.append(path)
    return changed


def propose_file_ops(cfg: OrchestratorConfig, task: str, context: Dict[str, Any], error_context: Optional[str] = None) -> Dict[str, Any]:
    files = context.get("files", [])
    file_list = "\n".join(f"- {f}" for f in files[:300])
    base_prompt = (
        "Eres un ingeniero de software. Devuelve SOLO JSON válido.\n"
        'Esquema: {"ops":[{"path":string,"content":string}], "notes":string}\n'
        "Reglas: solo paths relativos, sin binarios, sin markdown, sin explicaciones fuera de JSON.\n"
        "Si editas, devuelve el archivo completo.\n"
        f"Tarea: {task}\n"
        "Repo (archivos):\n"
        f"{file_list}\n"
    )
    if error_context:
        base_prompt += "\nErrores/tests:\n" + error_context[:6000]

    try:
        content = _chat(
            base_url=cfg.litellm_base_url,
            api_key=cfg.litellm_api_key,
            model=cfg.model,
            temperature=0.2,
            messages=[
                {"role": "system", "content": "JSON estricto. Sin texto extra."},
                {"role": "user", "content": base_prompt},
            ],
            timeout_s=180,
        )
        parsed = json.loads(content)
        ops = parsed.get("ops")
        if not isinstance(ops, list):
            ops = []
        return {"ops": ops, "notes": str(parsed.get("notes", ""))}
    except Exception:
        return {"ops": [], "notes": "fallback"}


def run_devin(cfg: OrchestratorConfig, task: str) -> Dict[str, Any]:
    run_id = f"devin-{int(time.time())}-{uuid.uuid4()}"
    started_at = int(time.time())

    plan = plan_graph(cfg, task)
    snapshot = _repo_snapshot(cfg)
    status = git_status(cfg.workspace_dir)

    changed_files: List[str] = []
    test_output: Optional[Dict[str, Any]] = None
    fix_loops = 0

    proposal = propose_file_ops(cfg, task, snapshot)
    changed_files += _apply_file_ops(cfg, proposal.get("ops", []))

    for _ in range(cfg.max_fix_loops + 1):
        test = run_tests(cfg.workspace_dir, timeout_s=900)
        test_output = {"code": test.code, "stdout": test.stdout[-12000:], "stderr": test.stderr[-12000:]}
        if test.code == 0:
            break
        fix_loops += 1
        diff = git_diff(cfg.workspace_dir)
        error_ctx = (
            "git diff:\n" + diff.stdout[-8000:]
            + "\n\nstdout:\n" + (test.stdout[-8000:] if test.stdout else "")
            + "\n\nstderr:\n" + (test.stderr[-8000:] if test.stderr else "")
        )
        proposal = propose_file_ops(cfg, task, snapshot, error_context=error_ctx)
        changed_files += _apply_file_ops(cfg, proposal.get("ops", []))

    diff_final = git_diff(cfg.workspace_dir)

    result = {
        "run_id": run_id,
        "task": task,
        "plan": plan,
        "repo_status": {"code": status.code, "stdout": status.stdout, "stderr": status.stderr},
        "changed_files": sorted(set(changed_files)),
        "tests": test_output,
        "git_diff": diff_final.stdout[-20000:],
        "fix_loops": fix_loops,
        "finished_at": int(time.time()),
        "started_at": started_at,
    }

    mem = get_memory()
    if mem is not None:
        try:
            mem.upsert(
                id=run_id,
                text=f"{task}\n{json.dumps(plan, ensure_ascii=False)}",
                payload={"task": task, "changed_files": result["changed_files"], "fix_loops": fix_loops},
            )
        except Exception:
            pass

    return result


def load_config(model: str = "fast") -> OrchestratorConfig:
    litellm_base_url = os.environ.get("LITELLM_BASE_URL", "http://litellm:4000/v1")
    litellm_api_key = os.environ.get("LITELLM_API_KEY", "")
    workspace_dir = os.environ.get("WORKSPACE_DIR", "/workspace")
    return OrchestratorConfig(
        litellm_base_url=litellm_base_url,
        litellm_api_key=litellm_api_key,
        workspace_dir=workspace_dir,
        model=model,
    )
