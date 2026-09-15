import json
import logging
import asyncio
import urllib.request
import time
from typing import List, Dict, Any, Optional

from nexa_skills import SKILLS_SCHEMA, execute_skill
from nexa_permissions import PermissionLevel, is_skill_allowed, get_permission_for_skill

logger = logging.getLogger(__name__)

class NexaAgent:
    """
    Agente Nativo de NEXA.
    Maneja el razonamiento, selección de herramientas, ejecución segura y
    mantenimiento del contexto conversacional para la resolución de tareas.
    """
    
    def __init__(self, ollama_url: str = "http://172.18.0.1:11434/api/chat", default_model: str = "deepseek-v3-lite"):
        self.ollama_url = ollama_url
        self.default_model = default_model
        
        # Límites estrictos para protección contra bucles infinitos
        self.MAX_AGENT_STEPS = 5
        self.TOOL_TIMEOUT = 10
        self.TOTAL_AGENT_TIMEOUT = 60
        
        # El rol del agente por defecto para esta sesión
        self.current_role = PermissionLevel.CONFIRM_REQUIRED

    async def run(self, messages: List[Dict[str, Any]], model: Optional[str] = None) -> Dict[str, Any]:
        """
        Ejecuta el bucle principal del agente.
        Recibe el historial de mensajes, inyecta las tools, y maneja las llamadas a funciones.
        Retorna el mensaje final del asistente.
        """
        target_model = model or self.default_model
        
        # Hacemos una copia local del historial para no mutar el global hasta terminar
        conversation_history = list(messages)
        
        # Inyectar estado de recuperación si existe (Anti-Replay)
        try:
            import os
            import time
            if os.path.exists("/etc/nexa/router_status.txt") and os.path.exists("/logs/pending_restart.txt"):
                with open("/etc/nexa/router_status.txt", "r") as f:
                    raw_status = f.read().strip()
                    
                if ":" in raw_status:
                    status, watchdog_uuid = raw_status.split(":", 1)
                else:
                    status, watchdog_uuid = raw_status, None
                    
                with open("/logs/pending_restart.txt", "r") as f:
                    pending_data = f.read().strip()
                
                if "|" in pending_data:
                    pending_uuid, timestamp = pending_data.split("|", 1)
                else:
                    pending_uuid, timestamp = pending_data, None

                # Verificación criptográfica (Anti-Replay)
                if watchdog_uuid and pending_uuid and watchdog_uuid == pending_uuid:
                    if status in ["HEALTHY", "FAILED"]:
                        # Calcular duración
                        duration = "Desconocida"
                        if timestamp:
                            try:
                                duration = f"{round(time.time() - float(timestamp), 2)}s"
                            except ValueError:
                                pass
                                
                        logger.info(f"[AUDIT] RECOVERY_COMPLETED | Tool: restart_nexa_router | RequestID: {watchdog_uuid} | Status: {status} | Duration: {duration}")

                        # Añadir mensaje de sistema al inicio
                        conversation_history.insert(0, {
                            "role": "system",
                            "content": f"[SISTEMA] Información interna de infraestructura: El último intento de reinicio del Router (ID: {watchdog_uuid}) resultó en estado '{status}'. La interrupción duró {duration}."
                        })
                        
                        # Consumo atómico
                        with open("/etc/nexa/router_status.tmp", "w") as f:
                            f.write("CONSUMED\n")
                        os.replace("/etc/nexa/router_status.tmp", "/etc/nexa/router_status.txt")
                        
                        # Limpiar el ticket pendiente
                        if os.path.exists("/logs/pending_restart.txt"):
                            os.remove("/logs/pending_restart.txt")
        except Exception as e:
            logger.error(f"NexaAgent: Error consumiendo el estado del router: {e}")
        
        start_time = time.time()
        step = 0
        
        while step < self.MAX_AGENT_STEPS:
            if time.time() - start_time > self.TOTAL_AGENT_TIMEOUT:
                logger.error("NexaAgent: Total timeout exceeded.")
                return {"role": "assistant", "content": "Lo siento, la tarea tomó demasiado tiempo y fue abortada por seguridad."}
                
            step += 1
            logger.info(f"NexaAgent [Step {step}]: Enviando contexto al modelo {target_model}...")
            
            payload = {
                "model": target_model,
                "messages": conversation_history,
                "tools": SKILLS_SCHEMA,
                "stream": False
            }
            
            try:
                req = urllib.request.Request(
                    self.ollama_url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json", "User-Agent": "NexaAgent"},
                    method="POST"
                )
                
                resp = await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=30))
                resp_body = resp.read().decode("utf-8")
                data = json.loads(resp_body)
                
                response_message = data.get("message", {})
                
                # Si el modelo decidió llamar a una o más herramientas
                if "tool_calls" in response_message and response_message["tool_calls"]:
                    # Añadir la intención del modelo al historial
                    conversation_history.append(response_message)
                    
                    tool_calls = response_message["tool_calls"]
                    for tc in tool_calls:
                        func_info = tc.get("function", {})
                        tool_name = func_info.get("name")
                        tool_args = func_info.get("arguments", {})
                        
                        logger.info(f"NexaAgent: Ejecutando Skill '{tool_name}' con args: {tool_args}")
                        
                        # 1. Validar Permisos
                        required_permission = get_permission_for_skill(tool_name)
                        if not is_skill_allowed(tool_name, self.current_role):
                            logger.warning(f"NexaAgent: Permiso denegado para la skill '{tool_name}'")
                            tool_result = {"error": f"Permission denied for skill {tool_name}"}
                        elif required_permission == PermissionLevel.CONFIRM_REQUIRED:
                            # HitL: Interceptar si no hay confirmación
                            user_confirmed = tool_args.get("user_confirmed", False)
                            if not user_confirmed:
                                tool_result = {"error": "CONFIRM_REQUIRED: Esta acción requiere autorización explícita. Pregúntale al usuario si confirma la operación y NO la ejecutes hasta que diga explícitamente que sí."}
                            else:
                                # Validación real: verificar el último mensaje del usuario
                                last_user_msg = next((m.get("content", "") for m in reversed(messages) if m.get("role") == "user"), "").lower()
                                confirm_keywords = ["sí", "si", "confirmo", "autorizo", "adelante", "ok", "hazlo", "procede", "yes"]
                                
                                # Buscar si el usuario usó alguna palabra de confirmación
                                # Podría ser un regex más avanzado, pero esto sirve para el MVP
                                is_confirmed_by_user = any(word in last_user_msg.split() or word + "," in last_user_msg for word in confirm_keywords)
                                
                                # Vinculación semántica (Cross-tool confirmation prevention)
                                # Buscar el último mensaje del asistente antes del último mensaje del usuario
                                last_assistant_msg = next((m.get("content", "").lower() for m in reversed(messages[:-1]) if m.get("role") == "assistant"), "")
                                
                                tool_keywords = {
                                    "restart_ollama": ["ollama", "reini"],
                                    "restart_nexa_router": ["router", "nexa", "reini"],
                                    "release_vram": ["vram", "memoria", "liber"],
                                    "load_model": ["model", "carga"],
                                    "unload_model": ["model", "descarg"]
                                }
                                keywords = tool_keywords.get(tool_name, [tool_name.replace("_", " ")])
                                is_tool_in_context = any(k in last_assistant_msg for k in keywords)
                                
                                if is_confirmed_by_user and is_tool_in_context:
                                    logger.info(f"NexaAgent: Confirmación de usuario validada para {tool_name}. Ejecutando...")
                                    try:
                                        tool_result = await asyncio.wait_for(execute_skill(tool_name, tool_args), timeout=self.TOOL_TIMEOUT)
                                    except asyncio.TimeoutError:
                                        tool_result = {"error": f"Skill {tool_name} timed out"}
                                    except Exception as e:
                                        tool_result = {"error": str(e)}
                                elif is_confirmed_by_user and not is_tool_in_context:
                                    logger.warning(f"NexaAgent: Bloqueado intento de Cross-tool confirmation para '{tool_name}'. El asistente no solicitó confirmar esta herramienta en su último turno.")
                                    tool_result = {"error": f"CONFIRM_REQUIRED: El usuario confirmó algo, pero no para la acción '{tool_name}'. Vuelve a preguntar específicamente por esta acción."}
                                else:
                                    logger.warning(f"NexaAgent: El modelo intentó pasar user_confirmed=True pero el último mensaje ({last_user_msg}) no contiene confirmación.")
                                    tool_result = {"error": "CONFIRM_REQUIRED: El usuario no ha confirmado explícitamente en su último mensaje. Vuelve a preguntar antes de ejecutar."}
                        else:
                            # 2. Ejecutar Skill de forma segura
                            try:
                                # TODO: Implementar timeout estricto por herramienta
                                tool_result = await asyncio.wait_for(
                                    execute_skill(tool_name, tool_args),
                                    timeout=self.TOOL_TIMEOUT
                                )
                            except asyncio.TimeoutError:
                                tool_result = {"error": f"Skill {tool_name} timed out"}
                            except Exception as e:
                                tool_result = {"error": str(e)}
                                
                        # 3. Incorporar resultado al historial
                        conversation_history.append({
                            "role": "tool",
                            "name": tool_name,
                            "content": json.dumps(tool_result)
                        })
                        
                        # 4. [AUDIT LOG] Estandarizar traza de la acción ejecutada
                        last_user_intent = next((m.get("content", "") for m in reversed(messages) if m.get("role") == "user"), "")
                        audit_status = "ERROR" if "error" in tool_result else "SUCCESS"
                        short_intent = (last_user_intent[:47] + '...') if len(last_user_intent) > 50 else last_user_intent
                        safe_args = json.dumps(tool_args)
                        logger.info(f"[AUDIT] ACTION_EXECUTED | Intent: \"{short_intent}\" | Tool: {tool_name} | Args: {safe_args} | Result: {audit_status}")
                    
                    # Continúa al siguiente ciclo (while) para que el modelo lea el resultado
                    continue
                else:
                    # Si no hay tool_calls, es la respuesta final de texto
                    logger.info("NexaAgent: Generación de respuesta final completada.")
                    return response_message
                    
            except Exception as e:
                logger.error(f"NexaAgent: Error al comunicarse con Ollama: {e}")
                return {"role": "assistant", "content": f"Error interno del agente: {e}"}
                
        # Si se superó el límite de pasos
        logger.warning(f"NexaAgent: Se superó el límite máximo de pasos ({self.MAX_AGENT_STEPS}).")
        return {"role": "assistant", "content": "Se superó el número máximo de operaciones internas. Proceso detenido."}
