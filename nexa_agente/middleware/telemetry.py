"""
NEXA OS — Telemetría y Observabilidad
Registra métricas de cada petición y llamada a AI para auditoría.
"""

import time
import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
from collections import defaultdict, deque
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("NEXA-TELEMETRY")


class MetricsCollector:
    """Recolector de métricas en memoria con ventanas de tiempo."""

    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.request_count = 0
        self.error_count = 0
        self.ai_calls: Dict[str, int] = defaultdict(int)
        self.ai_errors: Dict[str, int] = defaultdict(int)
        self.ai_latencies: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.ai_tokens: Dict[str, int] = defaultdict(int)
        self.recent_requests: deque = deque(maxlen=max_history)
        self.recent_errors: deque = deque(maxlen=200)
        self.start_time = time.time()

    def record_request(self, method: str, path: str, status: int, latency_ms: float):
        """Registra una petición HTTP."""
        self.request_count += 1
        if status >= 400:
            self.error_count += 1

        entry = {
            "time": datetime.now().isoformat(),
            "method": method,
            "path": path,
            "status": status,
            "latency_ms": round(latency_ms, 2)
        }
        self.recent_requests.append(entry)

        if status >= 500:
            self.recent_errors.append(entry)

    def record_ai_call(self, provider: str, latency_ms: float, tokens: int = 0, success: bool = True):
        """Registra una llamada a un proveedor de AI."""
        self.ai_calls[provider] += 1
        self.ai_latencies[provider].append(latency_ms)
        self.ai_tokens[provider] += tokens

        if not success:
            self.ai_errors[provider] += 1

        logger.info(
            f"📊 [AI-METRIC] Provider={provider} | Latencia={latency_ms:.0f}ms | "
            f"Tokens={tokens} | OK={success}"
        )

    def get_summary(self) -> Dict[str, Any]:
        """Genera un resumen completo de métricas."""
        uptime = time.time() - self.start_time

        # Calcular percentiles de latencia por proveedor
        ai_stats = {}
        for provider, latencies in self.ai_latencies.items():
            if latencies:
                sorted_lats = sorted(latencies)
                ai_stats[provider] = {
                    "calls": self.ai_calls[provider],
                    "errors": self.ai_errors.get(provider, 0),
                    "error_rate": round(self.ai_errors.get(provider, 0) / max(1, self.ai_calls[provider]) * 100, 1),
                    "tokens_total": self.ai_tokens[provider],
                    "latency_p50": round(sorted_lats[len(sorted_lats) // 2], 1),
                    "latency_p95": round(sorted_lats[int(len(sorted_lats) * 0.95)], 1) if len(sorted_lats) > 1 else round(sorted_lats[0], 1),
                    "latency_avg": round(sum(sorted_lats) / len(sorted_lats), 1),
                }

        return {
            "uptime_seconds": round(uptime, 0),
            "uptime_human": self._format_uptime(uptime),
            "requests": {
                "total": self.request_count,
                "errors": self.error_count,
                "error_rate": round(self.error_count / max(1, self.request_count) * 100, 2),
                "rps": round(self.request_count / max(1, uptime), 2),
            },
            "ai_providers": ai_stats,
            "recent_errors": list(self.recent_errors)[-10:],
            "timestamp": datetime.now().isoformat()
        }

    @staticmethod
    def _format_uptime(seconds: float) -> str:
        """Formatea uptime en formato legible."""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"


# Instancia global
metrics = MetricsCollector()


class TelemetryMiddleware(BaseHTTPMiddleware):
    """Middleware que mide la latencia y registra métricas de cada petición."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()

        try:
            response = await call_next(request)
            latency_ms = (time.time() - start) * 1000

            metrics.record_request(
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                latency_ms=latency_ms
            )

            # Headers de observabilidad
            response.headers["X-Response-Time"] = f"{latency_ms:.0f}ms"
            response.headers["X-Nexa-Version"] = "5.0-ULTRA"

            return response

        except Exception as e:
            latency_ms = (time.time() - start) * 1000
            metrics.record_request(
                method=request.method,
                path=request.url.path,
                status=500,
                latency_ms=latency_ms
            )
            raise
