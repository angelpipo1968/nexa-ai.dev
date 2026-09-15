#!/usr/bin/env python3
"""
NEXA Memory Monitor — VRAM-POOL Fase 0
--------------------------------------
Monitor de solo lectura. Lee VRAM (nvidia-smi) y RAM (/proc/meminfo).
Simula decisiones de asignación GPU+RAM sin aplicar nada.

Uso:
    python3 nexa_memory_monitor.py              # estado puro
    python3 nexa_memory_monitor.py 23.0         # simular modelo de 23 GB
    python3 nexa_memory_monitor.py 9.0          # simular modelo de 9 GB

NO modifica ningún servicio. Rollback = borrar este archivo.
"""

import subprocess
import sys
import os
import json
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


# ─── Constantes ─────────────────────────────────────────────────────────────

SAFETY_MARGIN_GB = 1.5
VERSION = "0.1.0"

# Perfiles de asignación
PROFILE_TURBO      = "🚀 Turbo"
PROFILE_BALANCED   = "⚖️  Balanced"
PROFILE_CINEMATIC  = "🎬 Cinematic"
PROFILE_EMERGENCY  = "🧠 Emergency"
PROFILE_IMPOSSIBLE = "❌ Imposible"
PROFILE_NONE       = "—  (sin modelo)"


# ─── Estructuras de datos ────────────────────────────────────────────────────

@dataclass
class VRAMInfo:
    gpu_name: str = "Unknown"
    total_gb: float = 0.0
    used_gb: float = 0.0
    free_gb: float = 0.0
    temperature_c: Optional[int] = None
    utilization_pct: Optional[int] = None
    source: str = "nvidia-smi"

@dataclass
class RAMInfo:
    total_gb: float = 0.0
    used_gb: float = 0.0
    available_gb: float = 0.0
    source: str = "/proc/meminfo"

@dataclass
class AllocationPlan:
    model_size_gb: float = 0.0
    gpu_budget_gb: float = 0.0
    ram_offload_gb: float = 0.0
    safety_margin_gb: float = SAFETY_MARGIN_GB
    profile: str = PROFILE_NONE
    feasible: bool = True
    note: str = ""


# ─── Fuente 1: nvidia-smi ────────────────────────────────────────────────────

def get_vram_nvidia_smi() -> VRAMInfo:
    """Lee VRAM desde nvidia-smi directamente (host o contenedor con GPU)."""
    info = VRAMInfo()
    try:
        # Query básico: nombre, memoria total, usada, libre
        cmd = [
            "nvidia-smi",
            "--query-gpu=name,memory.total,memory.used,memory.free,"
            "temperature.gpu,utilization.gpu",
            "--format=csv,noheader,nounits"
        ]
        result = subprocess.run(
            cmd,
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            raise RuntimeError(f"nvidia-smi error: {result.stderr.strip()}")

        line = result.stdout.strip().split("\n")[0]  # primera GPU
        parts = [p.strip() for p in line.split(",")]

        # name, total(MiB), used(MiB), free(MiB), temp(C), util(%)
        info.gpu_name         = parts[0]
        info.total_gb         = round(int(parts[1]) / 1024, 2)
        info.used_gb          = round(int(parts[2]) / 1024, 2)
        info.free_gb          = round(int(parts[3]) / 1024, 2)
        info.temperature_c    = int(parts[4]) if parts[4].isdigit() else None
        info.utilization_pct  = int(parts[5]) if parts[5].isdigit() else None
        info.source           = "nvidia-smi"

    except FileNotFoundError:
        # nvidia-smi no disponible en este host → intentar docker exec
        info = _get_vram_via_docker_exec()
    except Exception as e:
        info.gpu_name = f"ERROR: {e}"

    return info


def _get_vram_via_docker_exec() -> VRAMInfo:
    """Fallback: intenta leer nvidia-smi desde dentro de nexa-comfyui."""
    info = VRAMInfo(source="docker-exec:nexa-comfyui")
    try:
        cmd = [
            "sudo", "docker", "exec", "nexa-comfyui",
            "nvidia-smi",
            "--query-gpu=name,memory.total,memory.used,memory.free",
            "--format=csv,noheader,nounits"
        ]
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=15
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip())

        line = result.stdout.strip().split("\n")[0]
        parts = [p.strip() for p in line.split(",")]
        info.gpu_name = parts[0]
        info.total_gb = round(int(parts[1]) / 1024, 2)
        info.used_gb  = round(int(parts[2]) / 1024, 2)
        info.free_gb  = round(int(parts[3]) / 1024, 2)

    except Exception as e:
        info.gpu_name = f"ERROR (docker-exec): {e}"

    return info


# ─── Fuente 2: /proc/meminfo ─────────────────────────────────────────────────

def get_ram_procfs() -> RAMInfo:
    """Lee RAM desde /proc/meminfo (sin dependencias externas)."""
    info = RAMInfo()
    try:
        data = {}
        with open("/proc/meminfo", "r") as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 2:
                    key = parts[0].rstrip(":")
                    val_kb = int(parts[1])
                    data[key] = val_kb

        total_kb     = data.get("MemTotal", 0)
        available_kb = data.get("MemAvailable", 0)
        free_kb      = data.get("MemFree", 0)
        buffers_kb   = data.get("Buffers", 0)
        cached_kb    = data.get("Cached", 0)

        info.total_gb     = round(total_kb / (1024 ** 2), 2)
        info.available_gb = round(available_kb / (1024 ** 2), 2)
        info.used_gb      = round((total_kb - available_kb) / (1024 ** 2), 2)

    except Exception as e:
        info.total_gb = -1.0
        info.source = f"ERROR: {e}"

    return info


# ─── Fuente 3: ComfyUI /system_stats (opcional, vía Router) ─────────────────

def get_comfyui_stats(
    router_url: str = "http://localhost:8000",
    token: str = ""
) -> Optional[dict]:
    """
    Lee métricas de VRAM desde el Router (requiere F1 activa).
    Retorna None silenciosamente si no está disponible.
    """
    try:
        url = f"{router_url}/api/comfyui/health"
        req = urllib.request.Request(url, method="GET")
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Accept", "application/json")

        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode())
    except Exception:
        pass
    return None


# ─── Lógica de simulación de asignación ──────────────────────────────────────

def simulate_allocation(
    model_size_gb: float,
    vram: VRAMInfo,
    ram: RAMInfo,
) -> AllocationPlan:
    """
    Simula una decisión de asignación GPU+RAM.
    NO aplica nada — solo calcula y elige perfil.
    """
    plan = AllocationPlan(
        model_size_gb=model_size_gb,
        safety_margin_gb=SAFETY_MARGIN_GB,
    )

    if model_size_gb <= 0:
        plan.profile = PROFILE_NONE
        return plan

    # VRAM efectiva disponible (descontando margen de seguridad)
    effective_vram = max(0.0, vram.free_gb - SAFETY_MARGIN_GB)

    # ¿Cuánto va a GPU?
    gpu_budget = min(effective_vram, model_size_gb)
    ram_offload = max(0.0, model_size_gb - gpu_budget)

    plan.gpu_budget_gb  = round(gpu_budget, 2)
    plan.ram_offload_gb = round(ram_offload, 2)

    # ¿Es factible?
    if ram_offload > 0 and ram.available_gb < ram_offload + 2.0:
        # No hay RAM suficiente ni para el offload
        plan.feasible = False
        plan.profile  = PROFILE_IMPOSSIBLE
        plan.note     = (
            f"RAM disponible ({ram.available_gb:.2f} GB) insuficiente "
            f"para offload de {ram_offload:.2f} GB"
        )
        return plan

    plan.feasible = True

    # Elegir perfil
    if ram_offload == 0 and effective_vram >= model_size_gb + 2.0:
        plan.profile = PROFILE_TURBO
        plan.note    = "Modelo cabe en VRAM con margen. Velocidad máxima."
    elif ram_offload < 4.0:
        plan.profile = PROFILE_BALANCED
        plan.note    = f"Offload mínimo ({ram_offload:.2f} GB). Buen equilibrio."
    elif ram_offload < 8.0:
        plan.profile = PROFILE_CINEMATIC
        plan.note    = f"Offload moderado ({ram_offload:.2f} GB). Calidad priorizada."
    else:
        plan.profile = PROFILE_EMERGENCY
        plan.note    = f"Offload agresivo ({ram_offload:.2f} GB). Lento pero ejecutable."

    return plan


# ─── Renderer del reporte ────────────────────────────────────────────────────

W = 44  # ancho de la tabla

def _row(label: str, value: str, width: int = W) -> str:
    inner = f" {label:<22} {value:>15} "
    pad = width - len(inner) - 2
    return f"║{inner}{' ' * max(0, pad)}║"

def _div(width: int = W) -> str:
    return f"╠{'═' * (width - 2)}╣"

def _top(width: int = W) -> str:
    return f"╔{'═' * (width - 2)}╗"

def _bot(width: int = W) -> str:
    return f"╚{'═' * (width - 2)}╝"

def _title(text: str, width: int = W) -> str:
    inner = f" {text} "
    pad = width - len(inner) - 2
    left  = pad // 2
    right = pad - left
    return f"║{' ' * left}{inner}{' ' * right}║"


def render_report(
    vram: VRAMInfo,
    ram: RAMInfo,
    plan: AllocationPlan,
    comfyui_stats: Optional[dict],
    timestamp: datetime,
) -> str:
    lines = []
    lines.append(_top())
    lines.append(_title("NEXA MEMORY REPORT"))
    lines.append(_row("Versión", f"v{VERSION}"))
    lines.append(_row("Timestamp", timestamp.strftime("%H:%M:%S %Z")))
    lines.append(_div())

    # GPU / VRAM
    lines.append(_title("GPU / VRAM"))
    gpu_short = vram.gpu_name[:22] if len(vram.gpu_name) <= 22 else vram.gpu_name[:19] + "..."
    lines.append(_row("GPU", gpu_short))
    lines.append(_row("VRAM total", f"{vram.total_gb:.2f} GB"))
    lines.append(_row("VRAM usada", f"{vram.used_gb:.2f} GB"))
    lines.append(_row("VRAM libre", f"{vram.free_gb:.2f} GB"))
    if vram.temperature_c is not None:
        lines.append(_row("Temperatura", f"{vram.temperature_c} °C"))
    if vram.utilization_pct is not None:
        lines.append(_row("Utilización GPU", f"{vram.utilization_pct} %"))
    lines.append(_row("Fuente", vram.source))

    # ComfyUI cross-check (si está disponible)
    if comfyui_stats and comfyui_stats.get("ok"):
        lines.append(_div())
        lines.append(_title("ComfyUI cross-check"))
        lines.append(_row("VRAM libre (CUI)", f"{comfyui_stats.get('vram_free_gb', '?'):.2f} GB"))
        lines.append(_row("VRAM total (CUI)", f"{comfyui_stats.get('vram_total_gb', '?'):.2f} GB"))
        q_run = comfyui_stats.get("queue_running", 0)
        q_pen = comfyui_stats.get("queue_pending", 0)
        lines.append(_row("Queue running", str(q_run)))
        lines.append(_row("Queue pending", str(q_pen)))

    lines.append(_div())

    # RAM del sistema
    lines.append(_title("RAM del sistema"))
    lines.append(_row("RAM total", f"{ram.total_gb:.2f} GB"))
    lines.append(_row("RAM usada", f"{ram.used_gb:.2f} GB"))
    lines.append(_row("RAM disponible", f"{ram.available_gb:.2f} GB"))
    lines.append(_row("Fuente", ram.source))
    lines.append(_div())

    # Simulación de asignación
    lines.append(_title("Simulación de asignación"))
    if plan.model_size_gb > 0:
        lines.append(_row("Modelo hipotético", f"{plan.model_size_gb:.2f} GB"))
        lines.append(_row("→ GPU budget", f"{plan.gpu_budget_gb:.2f} GB"))
        lines.append(_row("→ RAM offload", f"{plan.ram_offload_gb:.2f} GB"))
        lines.append(_row("→ Safety margin", f"{plan.safety_margin_gb:.2f} GB"))
        lines.append(_row("Perfil elegido", plan.profile))
        if plan.note:
            # Truncar nota si es muy larga
            note_short = plan.note[:36] if len(plan.note) > 36 else plan.note
            lines.append(_row("Nota", note_short))
    else:
        lines.append(_row("Modelo", "—"))
        lines.append(_row("Uso", "Pasa un tamaño como arg"))
        lines.append(_row("Ejemplo", "nexa-mem 23.0"))

    lines.append(_div())

    # Status global
    status_vram = "OK" if vram.free_gb > SAFETY_MARGIN_GB else "⚠ LOW VRAM"
    status_ram  = "OK" if ram.available_gb > 4.0 else "⚠ LOW RAM"
    status_alloc = "FEASIBLE ✅" if plan.feasible else "IMPOSSIBLE ❌"

    if plan.model_size_gb > 0:
        status_line = status_alloc
    else:
        status_line = "READY ✅" if (status_vram == "OK" and status_ram == "OK") else "⚠ CHECK RESOURCES"

    lines.append(_row("VRAM status", status_vram))
    lines.append(_row("RAM status", status_ram))
    if plan.model_size_gb > 0:
        lines.append(_row("Allocation", status_line))
    lines.append(_bot())

    return "\n".join(lines)


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    model_size_gb = 0.0
    if len(sys.argv) > 1:
        try:
            model_size_gb = float(sys.argv[1])
        except ValueError:
            print(f"[ERROR] Argumento inválido: '{sys.argv[1]}'. Usa un número, ej: 23.0")
            sys.exit(1)

    # Variables de entorno opcionales para integración con Router (F1)
    router_url = os.getenv("NEXA_ROUTER_URL", "http://localhost:8000")
    router_token = os.getenv("NEXA_ROUTER_TOKEN", "")

    now = datetime.utcnow()

    print(f"\n  Recopilando telemetría...")

    vram = get_vram_nvidia_smi()
    ram  = get_ram_procfs()

    # Intentar ComfyUI stats vía Router (silencioso si no disponible)
    comfyui_stats = None
    if router_token:
        comfyui_stats = get_comfyui_stats(router_url, router_token)

    plan = simulate_allocation(model_size_gb, vram, ram)

    print()
    print(render_report(vram, ram, plan, comfyui_stats, now))
    print()

    # Exit code informativo
    if plan.model_size_gb > 0 and not plan.feasible:
        sys.exit(2)   # Imposible ejecutar el modelo
    sys.exit(0)


if __name__ == "__main__":
    main()
