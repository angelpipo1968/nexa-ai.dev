"""
Benchmark Engine
================
Mide métricas de referencia antes y después de un experimento.

Métricas capturadas:
  - VRAM: pico, inicial, final (via nvidia-smi)
  - Tiempo: wall clock
  - Calidad: métricas específicas del dominio (ffprobe para video, etc.)
  - GPU: utilización, temperatura máxima

Reutiliza el VRAMMonitor ya existente en engine/video_generation/.
"""

from __future__ import annotations

import logging
import subprocess
import time
import threading
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("nexa.evolution.benchmark")


def _nvidia_smi() -> Tuple[int, int, int]:
    """Retorna (vram_used_mib, temp_celsius, util_percent)."""
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=memory.used,temperature.gpu,utilization.gpu",
             "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
        parts = out.split(",")
        return int(parts[0].strip()), int(parts[1].strip()), int(parts[2].strip())
    except Exception:
        return 0, 0, 0


class VRAMSampler:
    """Muestrea VRAM en segundo plano a 100ms."""

    def __init__(self):
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self.peak_vram = 0
        self.initial_vram = 0
        self.final_vram = 0
        self.max_temp = 0
        self.max_util = 0
        self._first = True

    def start(self):
        self._running = True
        self._first = True
        self.peak_vram = self.max_temp = self.max_util = 0
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self) -> Dict[str, int]:
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
        vram, _, _ = _nvidia_smi()
        self.final_vram = vram
        return {
            "vram_initial_mib": self.initial_vram,
            "vram_peak_mib": self.peak_vram,
            "vram_final_mib": self.final_vram,
            "gpu_temp_max_celsius": self.max_temp,
            "gpu_util_max_percent": self.max_util,
        }

    def _loop(self):
        while self._running:
            vram, temp, util = _nvidia_smi()
            if self._first:
                self.initial_vram = vram
                self._first = False
            if vram > self.peak_vram: self.peak_vram = vram
            if temp > self.max_temp:  self.max_temp  = temp
            if util > self.max_util:  self.max_util  = util
            time.sleep(0.1)


class BenchmarkEngine:
    """
    Motor de benchmarks para experimentos de evolución.
    
    Uso:
        bench = BenchmarkEngine()
        baseline = bench.capture_baseline(description="Estado actual")
        # ... ejecutar experimento ...
        result = bench.capture_experiment(description="Con mejora X")
        delta = bench.compute_delta(baseline, result)
    """

    def __init__(self):
        self._sampler = VRAMSampler()

    def capture(self, description: str, fn, *args, **kwargs) -> Dict[str, Any]:
        """
        Ejecuta fn(*args, **kwargs) mientras mide métricas.
        
        Returns:
            Dict con métricas capturadas + resultado de fn + duración.
        """
        logger.info(f"[BenchmarkEngine] Midiendo: {description}")
        self._sampler.start()
        start_time = time.time()
        error = None
        fn_result = None

        try:
            fn_result = fn(*args, **kwargs)
        except Exception as e:
            error = str(e)
            logger.warning(f"[BenchmarkEngine] Error durante medición: {e}")
        finally:
            elapsed = time.time() - start_time
            vram_metrics = self._sampler.stop()

        metrics = {
            "description": description,
            "duration_seconds": round(elapsed, 2),
            "success": error is None,
            "error": error,
            "result": fn_result,
            **vram_metrics,
        }
        logger.info(
            f"[BenchmarkEngine] {description}: "
            f"{elapsed:.1f}s, VRAM pico={vram_metrics['vram_peak_mib']} MiB, "
            f"temp={vram_metrics['gpu_temp_max_celsius']}°C"
        )
        return metrics

    def compute_delta(
        self,
        baseline: Dict[str, Any],
        experiment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Computa el delta entre baseline y experimento.
        
        Positivo en vram/tiempo = regresión.
        Positivo en calidad = mejora.
        """
        numeric_keys = [
            "duration_seconds", "vram_peak_mib", "vram_initial_mib",
            "gpu_temp_max_celsius", "gpu_util_max_percent",
        ]
        delta = {}
        for k in numeric_keys:
            b_val = baseline.get(k, 0)
            e_val = experiment.get(k, 0)
            if isinstance(b_val, (int, float)) and isinstance(e_val, (int, float)):
                diff = e_val - b_val
                pct = (diff / b_val * 100) if b_val != 0 else 0
                delta[k] = {"baseline": b_val, "experiment": e_val, "delta": diff, "pct": round(pct, 1)}

        # Resumen legible
        vram_delta = delta.get("vram_peak_mib", {})
        time_delta = delta.get("duration_seconds", {})
        delta["_summary"] = (
            f"VRAM: {vram_delta.get('baseline', '?')} → {vram_delta.get('experiment', '?')} MiB "
            f"({vram_delta.get('pct', 0):+.1f}%) | "
            f"Tiempo: {time_delta.get('baseline', '?')} → {time_delta.get('experiment', '?')}s "
            f"({time_delta.get('pct', 0):+.1f}%)"
        )
        return delta
