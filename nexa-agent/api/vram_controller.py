import torch
import gc
import logging
import time
import sys
import json
import urllib.request
from typing import Dict, Optional, Any
from dataclasses import dataclass

import vram_logic

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Factor de seguridad: 15% extra para KV-cache, activaciones y buffers de cuantización
SAFETY_FACTOR = 1.15

class VRAMController:
    """Controlador dinámico de VRAM para Single GPU con soporte multi-engine (Ollama + PyTorch)"""

    def __init__(self, max_vram_gb: float = 22):
        self.max_vram_bytes = max_vram_gb * 1024**3
        self.loaded_models: Dict[str, Any] = {}
        self.last_error: str = ""
        self.model_configs = {}
        self._ollama_host = "host.docker.internal:11434"

    def get_used_vram(self) -> float:
        """VRAM física usada real (via nvidia-smi)."""
        return vram_logic.get_gpu_used_vram_gb()

    def get_available_vram(self) -> float:
        """Presupuesto NEXA disponible = límite NEXA configurado - VRAM usada real."""
        used = self.get_used_vram()
        max_gb = self.max_vram_bytes / (1024**3)
        available = round(max_gb - used, 2)
        logger.warning(f"DEBUG VRAM: used={used}, max_gb={max_gb}, available={available}")
        return max(available, 0.0)

    def get_ollama_ps_models(self) -> list:
        """Obtiene la lista de modelos actualmente cargados físicamente en memoria (Ollama)."""
        try:
            req = urllib.request.Request(f"http://{self._ollama_host}/api/ps", method="GET")
            with urllib.request.urlopen(req, timeout=2) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("models", [])
        except Exception as e:
            logger.warning(f"Error consultando Ollama /api/ps: {e}")
            return []

    def is_model_loaded_in_ollama(self, model_name: str) -> bool:
        """Verifica estrictamente si un modelo está cargado físicamente en Ollama."""
        models = self.get_ollama_ps_models()
        for m in models:
            if model_name in m.get("name", ""):
                return True
        return False

    def _get_model_size_gb(self, model_name: str) -> Optional[float]:
        """Obtiene el tamaño del modelo desde la API de Ollama (/api/tags).
        Retorna None si no se puede determinar (fallback permisivo en can_load).
        """
        try:
            ref = self._resolve_model_ref(model_name)
            req = urllib.request.Request(
                f"http://{self._ollama_host}/api/tags",
                headers={"User-Agent": "NexaVRAMGuard"}
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for m in data.get("models", []):
                    if m.get("name") == ref:
                        size_bytes = m.get("size", 0)
                        return round(size_bytes / (1024**3), 2)
        except Exception as e:
            logger.warning(f"No se pudo consultar tamaño de '{model_name}' en Ollama: {e}")
        return None

    def can_load(self, model_name: str) -> bool:
        """Verifica si el modelo cabe en el presupuesto VRAM de NEXA.
        Usa el tamaño real desde la API de Ollama + margen de seguridad del 15%.
        Si no se puede determinar el tamaño, permite la carga (fallback permisivo).
        """
        if model_name in self.loaded_models:
            logger.info(f"VRAM check: '{model_name}' ya está cargado.")
            return True
            
        # Sincronización dinámica: verificar si Ollama ya lo tiene cargado en memoria (ej. por NexaAgent)
        try:
            for m in self.get_ollama_ps_models():
                if model_name in m.get("name", ""):
                    self.loaded_models[model_name] = ("ollama", self._ollama_host, m.get("name"))
                    logger.info(f"VRAM check: Sincronizado '{model_name}' desde Ollama en memoria.")
                    return True
        except Exception as e:
            logger.debug(f"Error sincronizando con Ollama /api/ps: {e}")
            
        model_size_gb = self._get_model_size_gb(model_name)

        if model_size_gb is None:
            logger.warning(
                f"VRAM check: tamaño desconocido para '{model_name}', "
                f"permitiendo carga (fallback permisivo)"
            )
            return True

        vram_needed = round(model_size_gb * SAFETY_FACTOR, 2)
        vram_available = self.get_available_vram()
        can = vram_needed <= vram_available

        logger.info(
            f"VRAM check: '{model_name}' necesita ~{vram_needed:.2f} GB "
            f"(archivo={model_size_gb:.2f} GB × {SAFETY_FACTOR}), "
            f"disponible={vram_available:.2f} GB de {self.max_vram_bytes/(1024**3):.0f} GB NEXA → "
            f"{'✓ OK' if can else '✗ BLOQUEADO'}"
        )

        if not can:
            self.last_error = (
                f"VRAM insuficiente: '{model_name}' requiere ~{vram_needed:.1f} GB "
                f"pero solo hay {vram_available:.1f} GB disponibles "
                f"(presupuesto NEXA: {self.max_vram_bytes/(1024**3):.0f} GB)"
            )
        return can

    def unload_all(self):
        self.loaded_models.clear()

    def unload_model(self, model_name: str):
        if model_name in self.loaded_models:
            del self.loaded_models[model_name]
            return True
        return False

    def _resolve_model_ref(self, model_name: str) -> str:
        """Devuelve el nombre de modelo completo para Ollama.
        Si el nombre ya incluye un tag (detectado por ':' en la parte
        posterior al último '/'), lo usa tal cual.
        Si no, añade ':latest' por compatibilidad.
        """
        local_name = model_name.split("/")[-1]
        if ":" in local_name:
            return model_name  # ya tiene tag explícito
        return f"{model_name}:latest"

    def load_model(self, model_name: str) -> Optional[Any]:
        """Registra el modelo en el registry NEXA tras verificar disponibilidad de VRAM."""
        self.last_error = ""

        if not self.can_load(model_name):
            # last_error ya fue seteado por can_load()
            return None

        if model_name == "moondream" or "vision" in model_name.lower():
            ref = ("ollama", self._ollama_host, "moondream:latest")
            self.loaded_models[model_name] = ref
            return ref
        if model_name == "deepseek-v3-lite":
            ref = ("ollama", self._ollama_host, "deepseek-v3-lite:latest")
            self.loaded_models[model_name] = ref
            return ref

        ollama_model = self._resolve_model_ref(model_name)
        ref = ("ollama", self._ollama_host, ollama_model)
        self.loaded_models[model_name] = ref
        return ref

    def get_status(self) -> dict:
        used = self.get_used_vram()
        max_gb = self.max_vram_bytes / (1024**3)
        return {
            "vram_used_gb": used,
            "vram_available_gb": round(max_gb - used, 2),
            "loaded_models": list(self.loaded_models.keys()),
            "max_vram_gb": max_gb,
            "gpu_name": "NVIDIA GeForce RTX 3090"
        }
