import json
import logging
import asyncio
import urllib.request
import platform
import psutil

logger = logging.getLogger(__name__)

# Esquemas de las herramientas (OpenAI / Ollama compatible)
SKILLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_system_status",
            "description": "Obtiene información general del sistema del servidor NEXA (CPU, Memoria RAM).",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_gpu_status",
            "description": "Obtiene el estado actual de la GPU RTX 3090.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_vram_status",
            "description": "Obtiene el estado de la VRAM y qué modelo está actualmente activo.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_ollama_models",
            "description": "Obtiene la lista de modelos de IA disponibles actualmente en Ollama.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_nexa_health",
            "description": "Verifica el estado de salud de los componentes críticos de NEXA (Ollama, ComfyUI, etc).",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Busca información actualizada en internet usando DuckDuckGo.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "El término o pregunta a buscar en internet."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_nexa_logs",
            "description": "Lee las últimas líneas de los logs del sistema NEXA.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lines": {
                        "type": "integer",
                        "description": "Cantidad de líneas a leer desde el final (por defecto 50)."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_nexa_config",
            "description": "Lee el estado y la configuración interna de la infraestructura NEXA.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "release_vram",
            "description": "Libera la VRAM descargando todos los modelos cargados actualmente en Ollama.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "unload_model",
            "description": "Descarga de la memoria VRAM un modelo específico de inteligencia artificial.",
            "parameters": {
                "type": "object",
                "properties": {
                    "model_name": {
                        "type": "string",
                        "description": "El nombre exacto del modelo a descargar (ejemplo: 'deepseek-v3-lite')."
                    }
                },
                "required": ["model_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "load_model",
            "description": "Carga en la memoria VRAM un modelo específico de inteligencia artificial.",
            "parameters": {
                "type": "object",
                "properties": {
                    "model_name": {
                        "type": "string",
                        "description": "El nombre exacto del modelo a cargar (ejemplo: 'deepseek-v3-lite')."
                    }
                },
                "required": ["model_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "restart_ollama",
            "description": "Reinicia el servicio de Ollama en el sistema host.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_confirmed": {
                        "type": "boolean",
                        "description": "DEBE ser True si el usuario ha confirmado explícitamente en el último mensaje que desea realizar esta acción. Si no ha confirmado, DEBE ser False."
                    }
                },
                "required": ["user_confirmed"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "restart_nexa_router",
            "description": "Reinicia el servidor NEXA Router. Usa esto cuando el sistema general se cuelgue o necesite un reinicio fuerte.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_confirmed": {
                        "type": "boolean",
                        "description": "DEBE ser True si el usuario ha confirmado explícitamente en el último mensaje que desea realizar esta acción. Si no ha confirmado, DEBE ser False."
                    }
                },
                "required": ["user_confirmed"]
            }
        }
    }
]


class NexaSkillsExecutor:
    """Clase para ejecutar las Skills definidas."""
    
    @staticmethod
    async def get_system_status(**kwargs):
        mem = psutil.virtual_memory()
        return {
            "os": platform.system(),
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "ram_total_gb": round(mem.total / (1024**3), 2),
            "ram_used_gb": round(mem.used / (1024**3), 2),
            "ram_free_gb": round(mem.available / (1024**3), 2)
        }
        
    @staticmethod
    async def get_gpu_status(**kwargs):
        # Implementación segura simulada/básica leyendo nvidia-smi asíncronamente
        try:
            process = await asyncio.create_subprocess_shell(
                "nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu --format=csv,noheader",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await process.communicate()
            res = stdout.decode().strip()
            if res:
                parts = [p.strip() for p in res.split(",")]
                return {
                    "gpu_name": parts[0],
                    "temperature": parts[1] + " C" if len(parts) > 1 else "N/A",
                    "utilization": parts[2] if len(parts) > 2 else "N/A"
                }
            return {"error": "No output from nvidia-smi"}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    async def get_vram_status(**kwargs):
        # Podemos re-utilizar la lógica real importando vram_controller, pero para aislar:
        try:
            process = await asyncio.create_subprocess_shell(
                "nvidia-smi --query-gpu=memory.total,memory.used,memory.free --format=csv,noheader,nounits",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await process.communicate()
            res = stdout.decode().strip()
            if res:
                parts = [p.strip() for p in res.split(",")]
                # Intenta también consultar qué modelo tiene Ollama activo
                active_model = "Desconocido"
                try:
                    req = urllib.request.Request("http://172.18.0.1:11434/api/ps", method="GET")
                    resp = await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=2))
                    data = json.loads(resp.read().decode("utf-8"))
                    models = data.get("models", [])
                    if models:
                        active_model = models[0].get("name", "Desconocido")
                    else:
                        active_model = "Ninguno"
                except Exception:
                    pass

                return {
                    "vram_total_mb": int(parts[0]),
                    "vram_used_mb": int(parts[1]),
                    "vram_free_mb": int(parts[2]),
                    "active_model": active_model
                }
            return {"error": "No output from nvidia-smi"}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    async def get_ollama_models(**kwargs):
        try:
            req = urllib.request.Request("http://172.18.0.1:11434/api/tags", method="GET")
            resp = await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=2))
            data = json.loads(resp.read().decode("utf-8"))
            models = [m.get("name") for m in data.get("models", [])]
            return {"models": models}
        except Exception as e:
            return {"error": f"Failed to connect to Ollama: {e}"}

    @staticmethod
    async def get_nexa_health(**kwargs):
        status = {
            "nexa_router": "OK",
            "ollama": "UNKNOWN",
            "comfyui": "UNKNOWN"
        }
        
        # Test Ollama
        try:
            req = urllib.request.Request("http://172.18.0.1:11434/", method="GET")
            resp = await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=1))
            status["ollama"] = "OK" if resp.status == 200 else "ERROR"
        except Exception:
            status["ollama"] = "ERROR"

        # Test ComfyUI
        try:
            req = urllib.request.Request("http://127.0.0.1:8188/system_stats", method="GET")
            resp = await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=1))
            status["comfyui"] = "OK" if resp.status == 200 else "ERROR"
        except Exception:
            status["comfyui"] = "ERROR"
            
        return status

    @staticmethod
    async def search_web(**kwargs):
        query = kwargs.get("query", "")
        if not query:
            return {"error": "Se requiere un término de búsqueda (query)."}
        try:
            from duckduckgo_search import DDGS
            def do_search():
                results = []
                with DDGS() as ddgs:
                    for r in ddgs.text(query, max_results=3):
                        results.append(r)
                return results
            results = await asyncio.to_thread(do_search)
            return {"results": results}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    async def read_nexa_logs(**kwargs):
        lines = kwargs.get("lines", 50)
        log_file = "/logs/router.log"
        import os
        if not os.path.exists(log_file):
            return {"error": f"Log file no encontrado en {log_file}"}
        try:
            def read_tail():
                with open(log_file, "r", encoding="utf-8") as f:
                    content = f.readlines()
                    return "".join(content[-lines:])
            content = await asyncio.to_thread(read_tail)
            return {"logs": content}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    async def read_nexa_config(**kwargs):
        import os
        return {
            "max_vram_gb": os.getenv("MAX_VRAM_GB", "22"),
            "db_host": os.getenv("DB_HOST", "postgres"),
            "db_port": os.getenv("DB_PORT", "5432"),
            "redis_host": os.getenv("REDIS_HOST", "redis"),
            "qdrant_host": os.getenv("QDRANT_HOST", "qdrant"),
            "log_level": os.getenv("LOG_LEVEL", "INFO")
        }

    @staticmethod
    async def release_vram(**kwargs):
        import asyncio
        from vram_controller import VRAMController
        vram_ctrl = VRAMController()
        
        before_status = await NexaSkillsExecutor.get_vram_status()
        vram_antes = before_status.get("vram_used_mb", 0) / 1024.0
        
        # 1. Ask Ollama which models are loaded
        models = vram_ctrl.get_ollama_ps_models()
        loaded_models = [m.get("name") for m in models]
        
        unloaded = []
        if loaded_models:
            # 2. Descargar todos los modelos
            import urllib.request
            import json
            for model in loaded_models:
                try:
                    payload = json.dumps({"model": model, "keep_alive": 0}).encode("utf-8")
                    req = urllib.request.Request(
                        f"http://{vram_ctrl._ollama_host}/api/generate",
                        data=payload,
                        headers={"Content-Type": "application/json"},
                        method="POST"
                    )
                    await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=5))
                    unloaded.append(model)
                except Exception as e:
                    logger.error(f"Error descargando {model}: {e}")
                    
            # 3. Sync router
            try:
                req = urllib.request.Request("http://127.0.0.1:8000/api/v1/models/unload_all", method="POST")
                await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=2))
            except Exception:
                pass
                
        # 4. Wait a moment and check VRAM again
        await asyncio.sleep(2)
        after_status = await NexaSkillsExecutor.get_vram_status()
        vram_despues = after_status.get("vram_used_mb", 0) / 1024.0
        
        return {
            "vram_antes_gb": round(vram_antes, 2),
            "modelos_detectados": loaded_models,
            "accion": "modelos descargados" if unloaded else "nada que descargar",
            "vram_despues_gb": round(vram_despues, 2),
            "resultado": "OK" if vram_despues < vram_antes or not unloaded else "Sin cambio significativo"
        }

    @staticmethod
    async def unload_model(**kwargs):
        model_name = kwargs.get("model_name")
        if not model_name:
            return {"error": "Se requiere el nombre del modelo a descargar."}
            
        import asyncio
        from vram_controller import VRAMController
        vram_ctrl = VRAMController()
        
        before_status = await NexaSkillsExecutor.get_vram_status()
        vram_antes = before_status.get("vram_used_mb", 0) / 1024.0
        
        if not vram_ctrl.is_model_loaded_in_ollama(model_name):
            return {"resultado": f"El modelo '{model_name}' no estaba cargado en memoria."}
            
        # Descargar
        import urllib.request
        import json
        try:
            payload = json.dumps({"model": model_name, "keep_alive": 0}).encode("utf-8")
            req = urllib.request.Request(
                f"http://{vram_ctrl._ollama_host}/api/generate",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=5))
        except Exception as e:
            return {"error": f"Error descargando {model_name}: {e}"}
            
        # Sync router
        try:
            req = urllib.request.Request("http://127.0.0.1:8000/api/v1/models/unload", data=json.dumps({"model_name": model_name}).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
            await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=2))
        except Exception:
            pass
            
        await asyncio.sleep(2)
        after_status = await NexaSkillsExecutor.get_vram_status()
        vram_despues = after_status.get("vram_used_mb", 0) / 1024.0
        
        return {
            "accion": f"Modelo {model_name} descargado",
            "vram_antes_gb": round(vram_antes, 2),
            "vram_despues_gb": round(vram_despues, 2),
            "resultado": "OK"
        }

    @staticmethod
    async def load_model(**kwargs):
        model_name = kwargs.get("model_name")
        if not model_name:
            return {"error": "Se requiere el nombre del modelo a cargar."}
            
        import asyncio
        import urllib.request
        import json
        from vram_controller import VRAMController
        vram_ctrl = VRAMController()
        
        if vram_ctrl.is_model_loaded_in_ollama(model_name):
            return {"resultado": f"El modelo '{model_name}' ya se encuentra cargado en memoria."}
            
        # Comprobar presupuesto VRAM usando can_load
        if not vram_ctrl.can_load(model_name):
            return {"error": f"Rechazado: {vram_ctrl.last_error}"}
            
        before_status = await NexaSkillsExecutor.get_vram_status()
        vram_antes = before_status.get("vram_used_mb", 0) / 1024.0
        
        # Cargar modelo
        try:
            payload = json.dumps({"model": model_name}).encode("utf-8")
            req = urllib.request.Request(
                f"http://{vram_ctrl._ollama_host}/api/generate",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=30))
        except Exception as e:
            return {"error": f"Error físico al intentar cargar '{model_name}': {e}"}
            
        # Sync router
        try:
            req = urllib.request.Request("http://127.0.0.1:8000/api/v1/models/load", data=json.dumps({"model_name": model_name}).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
            await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=2))
        except Exception:
            pass
            
        await asyncio.sleep(2)
        after_status = await NexaSkillsExecutor.get_vram_status()
        vram_despues = after_status.get("vram_used_mb", 0) / 1024.0
        
        return {
            "accion": f"Modelo {model_name} cargado correctamente",
            "vram_antes_gb": round(vram_antes, 2),
            "vram_despues_gb": round(vram_despues, 2),
            "resultado": "OK"
        }

    @staticmethod
    async def restart_ollama(**kwargs):
        user_confirmed = kwargs.get("user_confirmed", False)
        if not user_confirmed:
            return {"error": "CONFIRM_REQUIRED: El usuario no ha confirmado explícitamente la acción."}
            
        import asyncio
        import uuid
        import time
        import os
        
        request_uuid = str(uuid.uuid4())
        timestamp = str(time.time())
        
        # Guardar en volumen persistente
        try:
            with open("/logs/pending_restart.txt", "w") as f:
                f.write(f"{request_uuid}|{timestamp}\n")
        except Exception as e:
            return {"error": f"Internal error storing pending restart state: {e}"}
        
        async def delayed_restart():
            await asyncio.sleep(8)
            try:
                with open("/etc/nexa/signals.fifo", "w") as f:
                    f.write(f"restart_ollama:{request_uuid}\n")
            except Exception:
                pass
                
        # Lanzar la tarea de reinicio en segundo plano (Disparo Diferido)
        asyncio.create_task(delayed_restart())
        
        return {
            "accion": "restart_ollama",
            "estado": "REINICIO DE OLLAMA PROGRAMADO EN 3 SEGUNDOS. Despídete del usuario indicando que el servicio de inferencia se reiniciará inmediatamente.",
            "resultado": "REQUESTED"
        }

    @staticmethod
    async def restart_nexa_router(**kwargs):
        user_confirmed = kwargs.get("user_confirmed", False)
        if not user_confirmed:
            return {"error": "CONFIRM_REQUIRED: El usuario no ha confirmado explícitamente la acción."}
            
        import asyncio
        import uuid
        import time
        import os
        
        request_uuid = str(uuid.uuid4())
        timestamp = str(time.time())
        
        # Guardar en volumen persistente
        try:
            with open("/logs/pending_restart.txt", "w") as f:
                f.write(f"{request_uuid}|{timestamp}\n")
        except Exception as e:
            return {"error": f"Internal error storing pending restart state: {e}"}
        
        async def delayed_restart():
            await asyncio.sleep(8)
            try:
                with open("/etc/nexa/signals.fifo", "w") as f:
                    f.write(f"restart_nexa_router:{request_uuid}\n")
            except Exception:
                pass
                
        # Lanzar la tarea de reinicio en segundo plano (Disparo Diferido)
        asyncio.create_task(delayed_restart())
        
        return {
            "accion": "restart_nexa_router",
            "estado": "REINICIO PROGRAMADO EN 3 SEGUNDOS. Despídete del usuario indicando que el sistema se reiniciará inmediatamente.",
            "resultado": "REQUESTED"
        }

async def execute_skill(skill_name: str, args: dict) -> dict:
    """Despacha la ejecución a la función correspondiente."""
    executor = NexaSkillsExecutor()
    if hasattr(executor, skill_name):
        method = getattr(executor, skill_name)
        try:
            result = await method(**args)
            return {"status": "success", "data": result}
        except Exception as e:
            logger.error(f"Error executing skill {skill_name}: {e}")
            return {"status": "error", "message": str(e)}
    else:
        return {"status": "error", "message": f"Skill {skill_name} not found"}
