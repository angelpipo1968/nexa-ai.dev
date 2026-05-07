"""
NEXA OS — Middleware de Autenticación
Valida tokens JWT/Bearer para proteger los endpoints de la API.
"""

import os
import hashlib
import hmac
import time
import logging
from typing import Optional
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("NEXA-AUTH")

# Rutas públicas que no requieren autenticación
PUBLIC_PATHS = {
    "/api/health",
    "/api/status",
    "/docs",
    "/openapi.json",
    "/favicon.ico",
}

# Prefijos públicos (assets estáticos del frontend)
PUBLIC_PREFIXES = (
    "/assets/",
    "/static/",
)


def generate_api_key(secret: str, identifier: str = "nexa-client") -> str:
    """Genera un API key HMAC-SHA256 determinístico basado en el secreto."""
    return hmac.new(
        secret.encode(),
        identifier.encode(),
        hashlib.sha256
    ).hexdigest()


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware de autenticación para NEXA OS.
    Soporta:
      - Bearer token (API key)
      - Query param ?api_key=...
      - Modo desarrollo (sin auth si NEXA_AUTH_DISABLED=true)
    """

    def __init__(self, app, api_secret: Optional[str] = None):
        super().__init__(app)
        self.api_secret = api_secret or os.getenv("NEXA_API_SECRET", "")
        self.auth_disabled = os.getenv("NEXA_AUTH_DISABLED", "false").lower() == "true"

        if self.auth_disabled:
            logger.warning("⚠️ [AUTH] Autenticación DESACTIVADA (modo desarrollo)")
        elif not self.api_secret:
            logger.warning("⚠️ [AUTH] NEXA_API_SECRET no configurado. Generando clave temporal...")
            self.api_secret = hashlib.sha256(f"nexa-temp-{time.time()}".encode()).hexdigest()[:32]
            logger.info(f"🔑 [AUTH] API Key temporal: {generate_api_key(self.api_secret)}")

    def _is_public(self, path: str) -> bool:
        """Verifica si la ruta es pública."""
        if path in PUBLIC_PATHS:
            return True
        if any(path.startswith(p) for p in PUBLIC_PREFIXES):
            return True
        # Las rutas del frontend SPA son públicas
        if not path.startswith("/api/"):
            return True
        return False

    def _validate_token(self, token: str) -> bool:
        """Valida el token contra el secreto configurado."""
        if not self.api_secret:
            return False
        expected = generate_api_key(self.api_secret)
        return hmac.compare_digest(token, expected)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Rutas públicas: no requieren auth
        if self._is_public(path):
            return await call_next(request)

        # Modo desarrollo: skip auth
        if self.auth_disabled:
            return await call_next(request)

        # Extraer token de Authorization header o query param
        token = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            token = request.query_params.get("api_key")

        if not token:
            logger.warning(f"🚫 [AUTH] Petición sin credenciales: {request.method} {path}")
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "No autorizado",
                    "message": "Se requiere un token de autenticación. Usa 'Authorization: Bearer <token>' o '?api_key=<token>'."
                }
            )

        if not self._validate_token(token):
            logger.warning(f"🚫 [AUTH] Token inválido para: {request.method} {path}")
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "Acceso denegado",
                    "message": "El token proporcionado no es válido."
                }
            )

        return await call_next(request)
