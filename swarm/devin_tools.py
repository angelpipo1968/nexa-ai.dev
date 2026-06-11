import os
import subprocess
from dataclasses import dataclass
from typing import Iterable, Optional


@dataclass(frozen=True)
class CommandResult:
    code: int
    stdout: str
    stderr: str


def _is_within(base_dir: str, path: str) -> bool:
    base = os.path.realpath(base_dir)
    target = os.path.realpath(path)
    return target == base or target.startswith(base + os.sep)


def safe_join(base_dir: str, rel_path: str) -> str:
    cleaned = rel_path.lstrip("/").replace("\\", "/")
    full = os.path.join(base_dir, cleaned)
    if not _is_within(base_dir, full):
        raise ValueError("path_outside_workspace")
    return full


def read_text(base_dir: str, rel_path: str, max_bytes: int = 200_000) -> str:
    full = safe_join(base_dir, rel_path)
    with open(full, "rb") as f:
        data = f.read(max_bytes + 1)
    return data[:max_bytes].decode("utf-8", errors="replace")


def write_text(base_dir: str, rel_path: str, content: str) -> None:
    full = safe_join(base_dir, rel_path)
    parent = os.path.dirname(full)
    os.makedirs(parent, exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)


def list_files(base_dir: str, max_files: int = 2000) -> list[str]:
    out: list[str] = []
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in {".git", ".venv", "node_modules", "build", "dist", ".next"}]
        for name in files:
            rel = os.path.relpath(os.path.join(root, name), base_dir).replace("\\", "/")
            out.append(rel)
            if len(out) >= max_files:
                return out
    return out


def run_cmd(
    *,
    cwd: str,
    cmd: list[str],
    timeout_s: int = 300,
    allowed_prefixes: Optional[Iterable[str]] = None,
) -> CommandResult:
    if not _is_within(cwd, cwd):
        raise ValueError("invalid_cwd")
    cmd_str = " ".join(cmd).strip()
    if allowed_prefixes is not None:
        ok = any(cmd_str.startswith(p) for p in allowed_prefixes)
        if not ok:
            raise ValueError("command_not_allowed")
    try:
        p = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            check=False,
        )
        return CommandResult(code=int(p.returncode), stdout=p.stdout or "", stderr=p.stderr or "")
    except FileNotFoundError as e:
        return CommandResult(code=127, stdout="", stderr=f"Command not found: {e}")


def git_status(cwd: str) -> CommandResult:
    return run_cmd(
        cwd=cwd,
        cmd=["git", "status", "--porcelain=v1", "--branch"],
        timeout_s=60,
        allowed_prefixes=["git status"],
    )


def git_diff(cwd: str) -> CommandResult:
    return run_cmd(
        cwd=cwd,
        cmd=["git", "diff", "--no-color"],
        timeout_s=60,
        allowed_prefixes=["git diff"],
    )


def run_tests(cwd: str, timeout_s: int = 600) -> CommandResult:
    allowed = (
        "python -m pytest",
        "pytest",
        "npm test",
        "pnpm test",
        "yarn test",
        "./gradlew test",
        "gradle test",
        "go test",
        "cargo test",
    )
    cmd = detect_test_command(cwd)
    return run_cmd(cwd=cwd, cmd=cmd, timeout_s=timeout_s, allowed_prefixes=allowed)


def detect_test_command(cwd: str) -> list[str]:
    if os.path.exists(os.path.join(cwd, "pytest.ini")) or os.path.exists(os.path.join(cwd, "pyproject.toml")):
        return ["python", "-m", "pytest", "-q"]
    if os.path.exists(os.path.join(cwd, "package.json")):
        return ["npm", "test"]
    if os.path.exists(os.path.join(cwd, "gradlew")):
        return ["./gradlew", "test"]
    if os.path.exists(os.path.join(cwd, "go.mod")):
        return ["go", "test", "./..."]
    if os.path.exists(os.path.join(cwd, "Cargo.toml")):
        return ["cargo", "test", "-q"]
    return ["python", "-m", "pytest", "-q"]
