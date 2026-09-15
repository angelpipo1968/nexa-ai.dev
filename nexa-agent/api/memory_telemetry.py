"""
memory_telemetry.py — NEXA VRAM Pool
─────────────────────────────────────
FASE 0: Módulo pasivo de telemetría de memoria.

Estado: DEPOSITADO — no se importa en main.py todavía.
Uso futuro: importar en vram_controller.py para decisiones dinámicas.

Fase 1 del VRAM Pool conectará este módulo al Router para que las
decisiones de asignación GPU+RAM sean automáticas y en tiempo real.

NO modifica ningún servicio. Rollback = borrar este archivo.
"""

import asyncio
import subprocess
import os
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────────────────────

class AllocationProfile(str, Enum):
    TURBO      = "turbo"      # 0 GB offload, margen > 2 GB
    BALANCED   = "balanced"   # offload < 4 GB
    CINEMATIC  = "cinematic"  # offload 4–8 GB
    EMERGENCY  = "emergency"  # offload >= 8 GB
    IMPOSSIBLE = "impossible" # RAM insuficiente
    NONE       = "none"       # sin modelo especificado


# ─── Estructuras de datos ────────────────────────────────────────────────────

@dataclass
class MemorySnapshot:
    """Instantánea del estado de VRAM + RAM en un momento dado."""
    # GPU
    gpu_name: str = "Unknown"
    vram_total_gb: float = 0.0
    vram_used_gb: float = 0.0
    vram_free_gb: float = 0.0
    gpu_temperature_c: Optional[int] = None
    gpu_utilization_pct: Optional[int] = None
    # RAM
    ram_total_gb: float = 0.0
    ram_used_gb: float = 0.0
    ram_available_gb: float = 0.0
    # Meta
    timestamp: datetime = field(default_factory=datetime.utcnow)
    source: str = "nvidia-smi+procfs"


@dataclass
class AllocationPlan:
    """
    Decisión de asignación para un modelo de tamaño dado.
    FASE 0: Solo lectura / simulación. No aplica nada.
    """
    model_size_gb: float = 0.0
    gpu_budget_gb: float = 0.0
    ram_offload_gb: float = 0.0
    safety_margin_gb: float = 1.5
    profile: AllocationProfile = AllocationProfile.NONE
    feasible: bool = True
    note: str = ""

    def as_dict(self) -> dict:
        return {
            "model_size_gb": self.model_size_gb,
            "gpu_budget_gb": self.gpu_budget_gb,
            "ram_offload_gb": self.ram_offload_gb,
            "safety_margin_gb": self.safety_margin_gb,
            "profile": self.profile.value,
            "feasible": self.feasible,
            "note": self.note,
        }


# ─── Clase principal ─────────────────────────────────────────────────────────

class MemoryTelemetry:
    """
    Telemetría de memoria para NEXA VRAM Pool.

    Uso futuro (Fase 1):
        telemetry = MemoryTelemetry()
        snap = await telemetry.snapshot()
        plan = telemetry.allocation_plan(model_gb=23.0)
        if plan.feasible:
            # aplicar plan...
    """

    SAFETY_MARGIN_GB: float = float(os.getenv("NEXA_SAFETY_MARGIN_GB", "1.5"))

    def __init__(self):
        self._last_snapshot: Optional[MemorySnapshot] = None

    # ── Snapshot ──────────────────────────────────────────────────────────────

    async def snapshot(self) -> MemorySnapshot:
        """Lee VRAM y RAM de forma no bloqueante."""
        loop = asyncio.get_event_loop()
        snap = await loop.run_in_executor(None, self._read_memory_sync)
        self._last_snapshot = snap
        return snap

    def snapshot_sync(self) -> MemorySnapshot:
        """Versión síncrona para compatibilidad con código no-async."""
        snap = self._read_memory_sync()
        self._last_snapshot = snap
        return snap

    def _read_memory_sync(self) -> MemorySnapshot:
        snap = MemorySnapshot()
        self._fill_vram(snap)
        self._fill_ram(snap)
        snap.timestamp = datetime.utcnow()
        return snap

    def _fill_vram(self, snap: MemorySnapshot) -> None:
        """Rellena datos de VRAM vía nvidia-smi."""
        try:
            cmd = [
                "nvidia-smi",
                "--query-gpu=name,memory.total,memory.used,memory.free,"
                "temperature.gpu,utilization.gpu",
                "--format=csv,noheader,nounits"
            ]
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=10
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip())

            parts = [p.strip() for p in result.stdout.strip().split("\n")[0].split(",")]
            snap.gpu_name           = parts[0]
            snap.vram_total_gb      = round(int(parts[1]) / 1024, 2)
            snap.vram_used_gb       = round(int(parts[2]) / 1024, 2)
            snap.vram_free_gb       = round(int(parts[3]) / 1024, 2)
            snap.gpu_temperature_c  = int(parts[4]) if parts[4].isdigit() else None
            snap.gpu_utilization_pct = int(parts[5]) if parts[5].isdigit() else None

        except FileNotFoundError:
            # Intentar via docker exec como fallback
            self._fill_vram_docker_exec(snap)
        except Exception as e:
            snap.gpu_name = f"ERROR: {e}"

    def _fill_vram_docker_exec(self, snap: MemorySnapshot) -> None:
        """Fallback: nvidia-smi via docker exec nexa-comfyui."""
        try:
            result = subprocess.run(
                ["sudo", "docker", "exec", "nexa-comfyui",
                 "nvidia-smi", "--query-gpu=name,memory.total,memory.used,memory.free",
                 "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0:
                parts = [p.strip() for p in result.stdout.strip().split(",")]
                snap.gpu_name      = parts[0]
                snap.vram_total_gb = round(int(parts[1]) / 1024, 2)
                snap.vram_used_gb  = round(int(parts[2]) / 1024, 2)
                snap.vram_free_gb  = round(int(parts[3]) / 1024, 2)
                snap.source        = "docker-exec:nexa-comfyui"
        except Exception as e:
            snap.gpu_name = f"ERROR (docker-exec): {e}"

    def _fill_ram(self, snap: MemorySnapshot) -> None:
        """Rellena datos de RAM vía /proc/meminfo."""
        try:
            data = {}
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    parts = line.split()
                    if len(parts) >= 2:
                        data[parts[0].rstrip(":")] = int(parts[1])

            total_kb     = data.get("MemTotal", 0)
            available_kb = data.get("MemAvailable", 0)
            snap.ram_total_gb     = round(total_kb / (1024 ** 2), 2)
            snap.ram_available_gb = round(available_kb / (1024 ** 2), 2)
            snap.ram_used_gb      = round((total_kb - available_kb) / (1024 ** 2), 2)
        except Exception as e:
            snap.ram_total_gb = -1.0

    # ── Decisiones ────────────────────────────────────────────────────────────

    def can_fit_in_vram(self, model_gb: float) -> bool:
        """¿El modelo cabe completamente en VRAM con margen de seguridad?"""
        if self._last_snapshot is None:
            raise RuntimeError("Llama a snapshot() antes de consultar decisiones.")
        effective = self._last_snapshot.vram_free_gb - self.SAFETY_MARGIN_GB
        return effective >= model_gb

    def allocation_plan(self, model_gb: float) -> AllocationPlan:
        """
        Calcula un plan de asignación GPU+RAM para el modelo dado.
        FASE 0: Simulación pura. No aplica nada.
        """
        if self._last_snapshot is None:
            raise RuntimeError("Llama a snapshot() antes de calcular un plan.")

        snap = self._last_snapshot
        plan = AllocationPlan(
            model_size_gb=model_gb,
            safety_margin_gb=self.SAFETY_MARGIN_GB,
        )

        if model_gb <= 0:
            plan.profile = AllocationProfile.NONE
            return plan

        effective_vram = max(0.0, snap.vram_free_gb - self.SAFETY_MARGIN_GB)
        gpu_budget     = min(effective_vram, model_gb)
        ram_offload    = max(0.0, model_gb - gpu_budget)

        plan.gpu_budget_gb  = round(gpu_budget, 2)
        plan.ram_offload_gb = round(ram_offload, 2)

        # Verificar RAM disponible para offload
        if ram_offload > 0 and snap.ram_available_gb < ram_offload + 2.0:
            plan.feasible = False
            plan.profile  = AllocationProfile.IMPOSSIBLE
            plan.note = (
                f"RAM disponible ({snap.ram_available_gb:.2f} GB) insuficiente "
                f"para offload de {ram_offload:.2f} GB"
            )
            return plan

        plan.feasible = True

        if ram_offload == 0 and effective_vram >= model_gb + 2.0:
            plan.profile = AllocationProfile.TURBO
            plan.note = "Modelo cabe en VRAM con margen. Velocidad máxima."
        elif ram_offload < 4.0:
            plan.profile = AllocationProfile.BALANCED
            plan.note = f"Offload mínimo ({ram_offload:.2f} GB). Buen equilibrio."
        elif ram_offload < 8.0:
            plan.profile = AllocationProfile.CINEMATIC
            plan.note = f"Offload moderado ({ram_offload:.2f} GB). Calidad priorizada."
        else:
            plan.profile = AllocationProfile.EMERGENCY
            plan.note = f"Offload agresivo ({ram_offload:.2f} GB). Lento pero ejecutable."

        return plan

    # ── Utilidades ────────────────────────────────────────────────────────────

    @property
    def last_snapshot(self) -> Optional[MemorySnapshot]:
        return self._last_snapshot

    def summary_dict(self) -> dict:
        """Resumen serializable para API responses (uso futuro en main.py)."""
        if self._last_snapshot is None:
            return {"error": "no_snapshot"}
        s = self._last_snapshot
        return {
            "gpu_name": s.gpu_name,
            "vram_total_gb": s.vram_total_gb,
            "vram_used_gb": s.vram_used_gb,
            "vram_free_gb": s.vram_free_gb,
            "ram_total_gb": s.ram_total_gb,
            "ram_available_gb": s.ram_available_gb,
            "safety_margin_gb": self.SAFETY_MARGIN_GB,
            "timestamp": s.timestamp.isoformat(),
        }


# ─── Singleton preparado para Fase 1 ─────────────────────────────────────────
# En Fase 1, main.py hará:
#   from memory_telemetry import memory_telemetry
#   await memory_telemetry.snapshot()
#
# Por ahora NO se instancia ni importa desde main.py.

memory_telemetry = MemoryTelemetry()
