"""
comfyui_client.py — Cliente HTTP mínimo para ComfyUI / AI-Dock Caddy proxy.

Fase F1: solo conectividad y diagnóstico. Sin modificar lógica de Ollama/VRAM.

Arquitectura:
  nexa-router ──► nexa-comfyui:8188 (Caddy) ──► localhost:18188 (ComfyUI nativo)
                       Bearer auth requerida

Notas:
  - urllib NO funciona aquí: no sigue HTTP 302 de Caddy → falso "Connection Refused".
  - httpx con follow_redirects=True resuelve el problema correctamente.
  - El token se lee de la variable de entorno COMFYUI_TOKEN en tiempo de startup.
"""

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ─── Constantes ──────────────────────────────────────────────────────────────

DEFAULT_TIMEOUT = float(os.getenv("COMFYUI_TIMEOUT", "10.0"))


# ─── Cliente ─────────────────────────────────────────────────────────────────

class ComfyUIClient:
    """Cliente asíncrono para la API de ComfyUI detrás del proxy Caddy de AI-Dock."""

    def __init__(self, base_url: str, token: str, timeout: float = DEFAULT_TIMEOUT):
        if not base_url:
            raise ValueError("COMFYUI_URL no puede estar vacío")
        if not token:
            raise ValueError("COMFYUI_TOKEN no puede estar vacío")

        self.base_url = base_url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        self._timeout = timeout
        logger.info(
            "ComfyUIClient inicializado → %s (timeout=%.1fs)", self.base_url, timeout
        )

    # ─── Helpers internos ────────────────────────────────────────────────────

    async def _get(self, path: str) -> dict[str, Any]:
        """GET autenticado con manejo explícito de errores."""
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(
                follow_redirects=True, timeout=self._timeout
            ) as client:
                resp = await client.get(url, headers=self._headers)

            if resp.status_code == 401:
                raise PermissionError(
                    f"ComfyUI: 401 Unauthorized en {path} — "
                    "verifica COMFYUI_TOKEN en .env"
                )
            if resp.status_code == 302:
                raise PermissionError(
                    f"ComfyUI: Redirigido a login en {path} — "
                    "token inválido o Caddy sin auth configurada"
                )
            if resp.status_code >= 500:
                raise RuntimeError(
                    f"ComfyUI: {resp.status_code} Server Error en {path}"
                )

            resp.raise_for_status()
            return resp.json()

        except httpx.ConnectError as exc:
            raise ConnectionError(
                f"No se puede conectar a ComfyUI en {self.base_url}: {exc}"
            ) from exc
        except httpx.TimeoutException as exc:
            raise TimeoutError(
                f"ComfyUI timeout ({self._timeout}s) en {path}: {exc}"
            ) from exc

    # ─── Endpoints públicos ──────────────────────────────────────────────────

    async def get_system_stats(self) -> dict[str, Any]:
        """GET /system_stats — info de GPU, versión, VRAM."""
        return await self._get("/system_stats")

    async def get_queue(self) -> dict[str, Any]:
        """GET /queue — estado de la cola de generación."""
        return await self._get("/queue")

    async def get_object_info(self, node_class: str | None = None) -> dict[str, Any]:
        """GET /object_info[/{node_class}] — nodos disponibles."""
        path = f"/object_info/{node_class}" if node_class else "/object_info"
        return await self._get(path)

    async def health_check(self) -> dict[str, Any]:
        """
        Comprueba conectividad y devuelve un resumen legible del estado de ComfyUI.

        Returns:
            dict con: ok, gpu, vram_free_gb, vram_total_gb, queue_pending, queue_running
        """
        try:
            stats = await self.get_system_stats()
            queue = await self.get_queue()

            # Extraer datos de GPU desde system_stats
            devices = stats.get("system", {}).get("cuda", {})
            if not devices:
                # Estructura alternativa en algunas versiones de ComfyUI
                devices = stats.get("devices", [{}])[0] if stats.get("devices") else {}

            gpu_name = (
                devices.get("name")
                or stats.get("system", {}).get("gpu", {}).get("name")
                or "Unknown GPU"
            )
            vram_free = (
                devices.get("vram_free")
                or stats.get("system", {}).get("gpu", {}).get("vram_free")
                or 0
            )
            vram_total = (
                devices.get("vram_total")
                or stats.get("system", {}).get("gpu", {}).get("vram_total")
                or 0
            )

            # Convertir de bytes a GB si el valor es > 1e6
            if vram_free > 1_000_000:
                vram_free = round(vram_free / (1024 ** 3), 2)
            if vram_total > 1_000_000:
                vram_total = round(vram_total / (1024 ** 3), 2)

            # Cola de ejecución
            queue_running = len(queue.get("queue_running", []))
            queue_pending = len(queue.get("queue_pending", []))

            return {
                "ok": True,
                "comfyui": "connected",
                "gpu": gpu_name,
                "vram_free_gb": vram_free,
                "vram_total_gb": vram_total,
                "queue_pending": queue_pending,
                "queue_running": queue_running,
            }

        except (ConnectionError, TimeoutError, PermissionError, RuntimeError) as exc:
            logger.warning("ComfyUI health_check falló: %s", exc)
            return {
                "ok": False,
                "comfyui": "unreachable",
                "error": str(exc),
            }
        except Exception as exc:  # noqa: BLE001
            logger.exception("ComfyUI health_check error inesperado")
            return {
                "ok": False,
                "comfyui": "error",
                "error": str(exc),
            }

    # ─── Métodos F1: generación de imagen ────────────────────────────────────

    async def _post(self, path: str, payload: dict) -> dict:
        """POST autenticado, devuelve JSON."""
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(
                follow_redirects=True, timeout=self._timeout
            ) as client:
                resp = await client.post(url, headers=self._headers, json=payload)
            if resp.status_code == 401:
                raise PermissionError(
                    f"ComfyUI: 401 Unauthorized en {path} — verifica COMFYUI_TOKEN"
                )
            if resp.status_code >= 500:
                raise RuntimeError(
                    f"ComfyUI: {resp.status_code} Server Error en {path}"
                )
            resp.raise_for_status()
            return resp.json()
        except httpx.ConnectError as exc:
            raise ConnectionError(
                f"No se puede conectar a ComfyUI en {self.base_url}: {exc}"
            ) from exc
        except httpx.TimeoutException as exc:
            raise TimeoutError(
                f"ComfyUI timeout ({self._timeout}s) en {path}: {exc}"
            ) from exc

    async def _get_bytes(self, path: str, params: dict | None = None) -> bytes:
        """GET autenticado, devuelve bytes crudos (para imágenes)."""
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(
                follow_redirects=True, timeout=self._timeout
            ) as client:
                resp = await client.get(
                    url,
                    headers={k: v for k, v in self._headers.items()
                              if k != "Content-Type"},
                    params=params,
                )
            if resp.status_code == 401:
                raise PermissionError(
                    f"ComfyUI: 401 Unauthorized en {path}"
                )
            resp.raise_for_status()
            return resp.content
        except httpx.ConnectError as exc:
            raise ConnectionError(
                f"No se puede conectar a ComfyUI: {exc}"
            ) from exc
        except httpx.TimeoutException as exc:
            raise TimeoutError(
                f"ComfyUI timeout descargando imagen: {exc}"
            ) from exc

    async def post_prompt(self, workflow: dict, client_id: str = "") -> str:
        """
        Envía un workflow a ComfyUI y devuelve el prompt_id.
        """
        payload = {"prompt": workflow, "client_id": client_id}
        data = await self._post("/prompt", payload)
        prompt_id = data.get("prompt_id", "")
        if not prompt_id:
            raise RuntimeError(
                f"ComfyUI no devolvió prompt_id. Respuesta: {data}"
            )
        logger.info("ComfyUI prompt encolado: %s", prompt_id)
        return prompt_id

    async def get_history(self, prompt_id: str) -> dict:
        """
        Recupera el historial de un job específico.
        """
        data = await self._get(f"/history/{prompt_id}")
        return data.get(prompt_id, {})

    async def get_image_bytes(
        self, filename: str, subfolder: str = "", img_type: str = "output"
    ) -> bytes:
        """
        Descarga los bytes crudos de una imagen generada por ComfyUI.
        """
        params = {"filename": filename, "subfolder": subfolder, "type": img_type}
        return await self._get_bytes("/view", params=params)

# ─── Singleton ───────────────────────────────────────────────────────────────

def build_client_from_env() -> "ComfyUIClient | None":
    """
    Construye el cliente desde variables de entorno.
    Devuelve None si COMFYUI_URL o COMFYUI_TOKEN no están definidos.
    """
    url = os.getenv("COMFYUI_URL", "").strip()
    token = os.getenv("COMFYUI_TOKEN", "").strip()

    if not url or not token:
        logger.warning(
            "ComfyUI no configurado: COMFYUI_URL=%s, COMFYUI_TOKEN=%s",
            "SET" if url else "MISSING",
            "SET" if token else "MISSING",
        )
        return None

    return ComfyUIClient(base_url=url, token=token)
