#!/usr/bin/env python3
"""
flux_certifier.py — NEXA FASE 2B
─────────────────────────────────
Certifica el comportamiento real de FLUX GGUF en producción.

Tests que ejecuta:
  A+B  Cold start + warm start: tiempo de generación, VRAM pico
  C    VRAM residual tras la generación
  (D y E se ejecutan manualmente, este script provee los comandos)

Uso:
    python3 /home/nexa/tools/flux_certifier.py [--url URL] [--prompt PROMPT]

Ejemplos:
    python3 /home/nexa/tools/flux_certifier.py
    python3 /home/nexa/tools/flux_certifier.py --url http://localhost:8000
    python3 /home/nexa/tools/flux_certifier.py --steps 20 --size 512

Sin dependencias externas. Solo stdlib.
"""

import argparse
import http.client
import json
import os
import subprocess
import sys
import threading
import time
import urllib.parse
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


# ─── Config ──────────────────────────────────────────────────────────────────

DEFAULT_URL    = "http://localhost:8000"
DEFAULT_PROMPT = "A futuristic city landscape, cyberpunk style, neon lights, high quality, detailed"
DEFAULT_STEPS  = 20
DEFAULT_WIDTH  = 512
DEFAULT_HEIGHT = 512
VRAM_POLL_S    = 0.5   # cada cuánto sondear nvidia-smi
RESIDUAL_WAIT  = 10    # segundos a esperar tras la generación para medir residual
VERSION        = "0.1.0"


# ─── Estructuras ─────────────────────────────────────────────────────────────

@dataclass
class VRAMSample:
    t: float        # timestamp relativo (s)
    used_gb: float
    free_gb: float


@dataclass
class GenerationResult:
    run_label: str          # "cold_start" | "warm_start"
    success: bool
    http_status: int = 0
    duration_s: float = 0.0
    image_bytes: int = 0
    error: str = ""
    vram_samples: List[VRAMSample] = field(default_factory=list)
    vram_peak_gb: float = 0.0
    vram_before_gb: float = 0.0
    vram_after_gb: float = 0.0   # medido RESIDUAL_WAIT s después


# ─── VRAM Poller ─────────────────────────────────────────────────────────────

class VRAMPoller:
    """Hilo que sondea nvidia-smi cada VRAM_POLL_S segundos."""

    def __init__(self):
        self.samples: List[VRAMSample] = []
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._start_t: float = 0.0

    def start(self):
        self.samples = []
        self._running = True
        self._start_t = time.monotonic()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=3)

    def _loop(self):
        while self._running:
            used, free = self._read()
            t = time.monotonic() - self._start_t
            self.samples.append(VRAMSample(t=round(t, 2), used_gb=used, free_gb=free))
            time.sleep(VRAM_POLL_S)

    @staticmethod
    def _read() -> tuple[float, float]:
        try:
            r = subprocess.run(
                ["nvidia-smi",
                 "--query-gpu=memory.used,memory.free",
                 "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=5
            )
            if r.returncode == 0:
                parts = r.stdout.strip().split(",")
                used = round(int(parts[0].strip()) / 1024, 2)
                free = round(int(parts[1].strip()) / 1024, 2)
                return used, free
        except Exception:
            pass
        return 0.0, 0.0

    def peak_used(self) -> float:
        if not self.samples:
            return 0.0
        return max(s.used_gb for s in self.samples)

    def first_used(self) -> float:
        return self.samples[0].used_gb if self.samples else 0.0

    def last_used(self) -> float:
        return self.samples[-1].used_gb if self.samples else 0.0


# ─── HTTP Client (stdlib) ─────────────────────────────────────────────────────

def post_generate_image(base_url: str, prompt: str, steps: int, width: int, height: int) -> tuple[int, bytes]:
    """
    POST /api/generate-image
    Devuelve (status_code, body_bytes)
    Timeout alto (300 s) para cold start.
    """
    parsed = urllib.parse.urlparse(base_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 8000

    payload = json.dumps({
        "prompt": prompt,
        "steps": steps,
        "width": width,
        "height": height,
    }).encode("utf-8")

    conn = http.client.HTTPConnection(host, port, timeout=300)
    try:
        conn.request(
            "POST",
            "/generate-image",
            body=payload,
            headers={
                "Content-Type": "application/json",
                "Content-Length": str(len(payload)),
            }
        )
        resp = conn.getresponse()
        body = resp.read()
        return resp.status, body
    finally:
        conn.close()


# ─── Ejecución de un run ──────────────────────────────────────────────────────

def run_generation(
    label: str,
    base_url: str,
    prompt: str,
    steps: int,
    width: int,
    height: int,
) -> GenerationResult:
    result = GenerationResult(run_label=label, success=False)

    poller = VRAMPoller()
    poller.start()
    result.vram_before_gb = poller.first_used() or VRAMPoller._read()[0]

    t0 = time.monotonic()
    try:
        status, body = post_generate_image(base_url, prompt, steps, width, height)
        elapsed = time.monotonic() - t0
        result.http_status = status
        result.duration_s  = round(elapsed, 2)

        if status == 200:
            result.success = True
            result.image_bytes = len(body)
        else:
            # Intentar parsear JSON de error
            try:
                err = json.loads(body.decode("utf-8", errors="replace"))
                result.error = err.get("detail", body[:200].decode("utf-8", errors="replace"))
            except Exception:
                result.error = body[:200].decode("utf-8", errors="replace")

    except Exception as e:
        result.duration_s = round(time.monotonic() - t0, 2)
        result.error = str(e)

    poller.stop()
    result.vram_samples = poller.samples
    result.vram_peak_gb = poller.peak_used()

    # Esperar y medir residual
    print(f"  [{label}] Esperando {RESIDUAL_WAIT}s para medir VRAM residual...")
    time.sleep(RESIDUAL_WAIT)
    result.vram_after_gb = VRAMPoller._read()[0]

    return result


# ─── Reporte ──────────────────────────────────────────────────────────────────

W = 52

def _top():    return f"╔{'═'*(W-2)}╗"
def _bot():    return f"╚{'═'*(W-2)}╝"
def _div():    return f"╠{'═'*(W-2)}╣"
def _title(t): pad = W-2-len(t)-2; l=pad//2; r=pad-l; return f"║ {' '*l}{t}{' '*r} ║"
def _row(label, value):
    inner = f" {label:<28}{value:>18} "
    return f"║{inner[:W-2]}║"

def _vram_sparkline(samples: List[VRAMSample], width: int = 40) -> str:
    """Mini gráfico de barras ASCII de uso de VRAM a lo largo del tiempo."""
    if not samples:
        return "(sin datos)"
    values = [s.used_gb for s in samples]
    mn, mx = min(values), max(values)
    rng = mx - mn if mx != mn else 1.0
    bars = "▁▂▃▄▅▆▇█"
    # Subsamplear si hay muchos puntos
    step = max(1, len(values) // width)
    subset = values[::step][:width]
    line = ""
    for v in subset:
        idx = int((v - mn) / rng * (len(bars) - 1))
        line += bars[idx]
    return line


def print_result(r: GenerationResult):
    lines = []
    ok = "✅" if r.success else "❌"
    lines.append(_top())
    lines.append(_title(f"RUN: {r.run_label.upper()}  {ok}"))
    lines.append(_div())

    # Resultado HTTP
    lines.append(_row("HTTP status", str(r.http_status)))
    lines.append(_row("Duración total", f"{r.duration_s:.2f} s"))
    if r.success:
        kb = r.image_bytes / 1024
        lines.append(_row("Tamaño PNG", f"{kb:.1f} KB"))
    else:
        err_short = r.error[:42] + "…" if len(r.error) > 42 else r.error
        lines.append(_row("Error", err_short))

    lines.append(_div())

    # VRAM
    lines.append(_row("VRAM antes", f"{r.vram_before_gb:.2f} GB"))
    lines.append(_row("VRAM pico", f"{r.vram_peak_gb:.2f} GB"))
    lines.append(_row("VRAM después (+10s)", f"{r.vram_after_gb:.2f} GB"))
    delta_pico = r.vram_peak_gb - r.vram_before_gb
    delta_res  = r.vram_after_gb - r.vram_before_gb
    lines.append(_row("  Δ pico (vs antes)", f"+{delta_pico:.2f} GB"))
    lines.append(_row("  Δ residual (vs antes)", f"+{delta_res:.2f} GB"))
    lines.append(_row("  Muestras capturadas", str(len(r.vram_samples))))

    lines.append(_div())

    # Sparkline
    spark = _vram_sparkline(r.vram_samples, width=44)
    lines.append(_row("VRAM timeline", ""))
    spark_line = f"  {spark}"
    lines.append(f"║{spark_line:<{W-2}}║")

    lines.append(_bot())
    print("\n".join(lines))


def print_comparison(cold: GenerationResult, warm: GenerationResult):
    print()
    print(f"{'═'*W}")
    print(f"  COMPARATIVA  Cold vs Warm Start")
    print(f"{'═'*W}")
    rows = [
        ("Duración",          f"{cold.duration_s:.2f} s",  f"{warm.duration_s:.2f} s",  f"{cold.duration_s-warm.duration_s:+.2f} s"),
        ("VRAM pico",         f"{cold.vram_peak_gb:.2f} GB", f"{warm.vram_peak_gb:.2f} GB", ""),
        ("VRAM residual",     f"{cold.vram_after_gb:.2f} GB", f"{warm.vram_after_gb:.2f} GB", ""),
        ("Tamaño PNG",        f"{cold.image_bytes//1024} KB",  f"{warm.image_bytes//1024} KB", ""),
    ]
    print(f"  {'Métrica':<22} {'Cold':>10} {'Warm':>10} {'Δ':>8}")
    print(f"  {'─'*22} {'─'*10} {'─'*10} {'─'*8}")
    for label, c, w, d in rows:
        print(f"  {label:<22} {c:>10} {w:>10} {d:>8}")
    print()

    # Diagnóstico automático
    speedup = cold.duration_s - warm.duration_s
    if speedup > 10:
        print("  ℹ️  Warm start es significativamente más rápido → modelo cacheado en VRAM.")
    elif speedup > 2:
        print("  ℹ️  Warm start es algo más rápido → carga parcial.")
    else:
        print("  ℹ️  Cold y warm tienen tiempos similares → posible descarga completa entre runs.")

    if warm.vram_after_gb > cold.vram_before_gb + 0.5:
        print(f"  ⚠️  VRAM residual ({warm.vram_after_gb:.2f} GB) mayor que baseline ({cold.vram_before_gb:.2f} GB) → modelo retenido en VRAM.")
    else:
        print(f"  ✅ VRAM residual próxima al baseline → modelo liberado correctamente.")


def print_part_d_instructions():
    print()
    print(f"{'═'*W}")
    print("  PARTE D — Test de Persistencia (manual)")
    print(f"{'═'*W}")
    print("""
  Ejecuta en nexa-server:

  1. Recrear contenedor:
     sudo docker compose -f /home/nexa/docker-compose-secure.yml \\
       up -d --force-recreate nexa-comfyui

  2. Esperar ~60s a que arranque, luego verificar:
     sudo docker exec nexa-comfyui \\
       python3 -c "import gguf; print('gguf OK:', gguf.__version__)"

  3. Verificar nodo ComfyUI-GGUF:
     curl -s http://localhost:8188/object_info | \\
       python3 -c "import sys,json; d=json.load(sys.stdin); \\
         print('UnetLoaderGGUF:', 'UnetLoaderGGUF' in d)"

  Si el import de gguf falla → la dependencia NO sobrevive recreaciones.
  Siguiente paso: añadirla al Dockerfile o al provisioning.sh de ai-dock.
""")


def print_part_e_instructions():
    print()
    print(f"{'═'*W}")
    print("  PARTE E — Test de Concurrencia (manual)")
    print(f"{'═'*W}")
    print("""
  Ejecuta en dos terminales:

  Terminal 1 (cargar Ollama):
    curl -s -X POST http://localhost:8000/v1/chat/completions \\
      -H "Content-Type: application/json" \\
      -d '{"model":"deepseek-v3-lite","messages":[{"role":"user","content":"Cuenta hasta 100"}],"stream":false}' &

  Terminal 2 (inmediatamente después, solicitar imagen):
    curl -s -X POST http://localhost:8000/api/generate-image \\
      -H "Content-Type: application/json" \\
      -d '{"prompt":"test concurrency","steps":10,"width":256,"height":256}' \\
      -w "\\nHTTP: %{http_code} | Time: %{time_total}s\\n" -o /dev/null

  Observar:
  - ¿La imagen se encola o falla con 503?
  - ¿El Router reporta "VRAM insuficiente" o espera?
  - Revisar logs: sudo docker logs nexa-router --tail=50
""")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="NEXA FASE 2B — FLUX Certifier")
    parser.add_argument("--url",    default=DEFAULT_URL,    help="URL del Router (default: %(default)s)")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="Prompt de generación")
    parser.add_argument("--steps",  type=int, default=DEFAULT_STEPS, help="Pasos de inferencia")
    parser.add_argument("--width",  type=int, default=DEFAULT_WIDTH)
    parser.add_argument("--height", type=int, default=DEFAULT_HEIGHT)
    args = parser.parse_args()

    print(f"\n  NEXA FASE 2B — FLUX GGUF Certifier v{VERSION}")
    print(f"  {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"  URL    : {args.url}")
    print(f"  Prompt : {args.prompt[:60]}...")
    print(f"  Config : {args.width}x{args.height} · {args.steps} steps")
    print(f"  Polling: {VRAM_POLL_S}s")
    print()

    results = {}

    # ── A+B: Cold start ───────────────────────────────────────────────────────
    print("  ▶ Ejecutando COLD START (primera generación)...")
    cold = run_generation(
        "cold_start", args.url, args.prompt,
        args.steps, args.width, args.height
    )
    results["cold"] = cold
    print()
    print_result(cold)

    if not cold.success:
        print(f"\n  ❌ Cold start falló. Abortando certificación.")
        print(f"     Error: {cold.error}")
        print(f"     Verifica que /api/generate-image esté operativo.")
        sys.exit(1)

    # ── A+B: Warm start ───────────────────────────────────────────────────────
    print()
    print("  ▶ Ejecutando WARM START (segunda generación, mismas condiciones)...")
    warm = run_generation(
        "warm_start", args.url, args.prompt,
        args.steps, args.width, args.height
    )
    results["warm"] = warm
    print()
    print_result(warm)

    # ── Comparativa ───────────────────────────────────────────────────────────
    print_comparison(cold, warm)

    # ── Guardar resultados JSON ───────────────────────────────────────────────
    out_path = f"/tmp/flux_cert_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    report = {
        "timestamp": datetime.utcnow().isoformat(),
        "config": {
            "url": args.url,
            "prompt": args.prompt,
            "steps": args.steps,
            "width": args.width,
            "height": args.height,
        },
        "cold_start": {
            "success": cold.success,
            "duration_s": cold.duration_s,
            "http_status": cold.http_status,
            "image_bytes": cold.image_bytes,
            "vram_before_gb": cold.vram_before_gb,
            "vram_peak_gb": cold.vram_peak_gb,
            "vram_after_gb": cold.vram_after_gb,
            "vram_samples": [{"t": s.t, "used_gb": s.used_gb, "free_gb": s.free_gb} for s in cold.vram_samples],
            "error": cold.error,
        },
        "warm_start": {
            "success": warm.success,
            "duration_s": warm.duration_s,
            "http_status": warm.http_status,
            "image_bytes": warm.image_bytes,
            "vram_before_gb": warm.vram_before_gb,
            "vram_peak_gb": warm.vram_peak_gb,
            "vram_after_gb": warm.vram_after_gb,
            "vram_samples": [{"t": s.t, "used_gb": s.used_gb, "free_gb": s.free_gb} for s in warm.vram_samples],
            "error": warm.error,
        },
    }
    try:
        with open(out_path, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\n  📄 Resultados guardados en: {out_path}")
    except Exception as e:
        print(f"\n  ⚠️  No se pudo guardar JSON: {e}")

    # ── Instrucciones partes D y E ────────────────────────────────────────────
    print_part_d_instructions()
    print_part_e_instructions()

    print(f"\n  Certificación A+B+C completada. Ejecuta D y E manualmente.\n")


if __name__ == "__main__":
    main()
