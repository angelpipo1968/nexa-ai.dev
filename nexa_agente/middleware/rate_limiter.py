"""
NEXA OS — Rate Limiter Middleware
Protección contra abuso y DoS usando sliding window en memoria.
"""

import time
import logging
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("NEXA-RATELIMIT")


class SlidingWindowCounter:
    """Contador con ventana deslizante para rate limiting preciso."""

    def __init__(self, window_seconds: int = 60, max_requests: int = 30):
        self.window = window_seconds
        self.max_requests = max_requests
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        """Verifica si el key tiene permitido hacer una petición."""
        now = time.time()
        cutoff = now - self.window

        # Limpiar entradas viejas
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]

        if len(self.requests[key]) >= self.max_requests:
            return False

        self.requests[key].append(now)
        return True

    def get_remaining(self, key: str) -> int:
        """Retorna cuántas peticiones quedan en la ventana actual."""
        now = time.time()
        cutoff = now - self.window
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]
        return max(0, self.max_requests - len(self.requests[key]))

    def get_reset_time(self, key: str) -> float:
        """Retorna cuándo se resetea la ventana (en segundos)."""
        if not self.requests[key]:
            return 0
        oldest = min(self.requests[key])
        return max(0, (oldest + self.window) - time.time())

    def cleanup(self):
        """Limpia entradas expiradas para liberar memoria."""
        now = time.time()
        expired_keys = []
        for key, timestamps in self.requests.items():
            self.requests[key] = [t for t in timestamps if t > now - self.window]
            if not self.requests[key]:
                expired_keys.append(key)
        for key in expired_keys:
            del self.requests[key]


# Configuraciones por tipo de endpoint
RATE_LIMITS = {
    "/api/ai/": SlidingWindowCounter(window_seconds=60, max_requests=20),   # AI proxy: 20/min
    "/api/chat": SlidingWindowCounter(window_seconds=60, max_requests=30),   # Chat: 30/min
    "/api/": SlidingWindowCounter(window_seconds=60, max_requests=100),      # General API: 100/min
}

# Rutas exentas de rate limiting
EXEMPT_PATHS = {"/api/health", "/api/status", "/api/metrics"}


def _get_client_key(request: Request) -> str:
    """Obtiene un identificador único del cliente."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _get_limiter(path: str) -> SlidingWindowCounter:
    """Encuentra el rate limiter apropiado para la ruta."""
    for prefix, limiter in RATE_LIMITS.items():
        if path.startswith(prefix):
            return limiter
    return RATE_LIMITS["/api/"]


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware de rate limiting con ventana deslizante."""

    def __init__(self, app):
        super().__init__(app)
        self._last_cleanup = time.time()

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Solo aplicar rate limiting a rutas de API
        if not path.startswith("/api/") or path in EXEMPT_PATHS:
            return await call_next(request)

        client_key = _get_client_key(request)
        limiter = _get_limiter(path)

        if not limiter.is_allowed(client_key):
            remaining = limiter.get_remaining(client_key)
            reset_in = limiter.get_reset_time(client_key)

            logger.warning(f"🚦 [RATE-LIMIT] {client_key} excedió el límite en {path}")

            return JSONResponse(
                status_code=429,
                content={
                    "error": "Demasiadas peticiones",
                    "message": f"Has excedido el límite de peticiones. Intenta de nuevo en {int(reset_in)} segundos.",
                    "retry_after": int(reset_in)
                },
                headers={
                    "Retry-After": str(int(reset_in)),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time() + reset_in))
                }
            )

        # Headers informativos
        response = await call_next(request)
        remaining = limiter.get_remaining(client_key)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Limit"] = str(limiter.max_requests)

        # Limpieza periódica de memoria (cada 5 minutos)
        now = time.time()
        if now - self._last_cleanup > 300:
            for lim in RATE_LIMITS.values():
                lim.cleanup()
            self._last_cleanup = now

        return response
