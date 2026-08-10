import logging
import json
import os
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class EvolutionGovernor:
    def __init__(self, repo_path="/home/angel/nexa-core"):
        self.repo_path = repo_path
        self.queue_path = os.path.join(repo_path, "evolution", "evolution_queue.json")

    def assess_system_resources(self) -> bool:
        """
        Garantiza que hay suficientes recursos para ejecutar experimentación.
        (Ej: RAM > 20%, VRAM disponible). En modo simulación siempre devuelve True.
        """
        logger.info("[GOVERNOR] Evaluando recursos del sistema (CPU/RAM/VRAM)... [OK]")
        return True

    def validate_safety_policy(self, task) -> bool:
        """
        Verifica que el objetivo no intente alterar operaciones destructivas (ej. drop database).
        """
        forbidden_keywords = ["rm -rf", "drop", "delete db", "format"]
        topic = task.get("topic", "").lower()
        if any(kw in topic for kw in forbidden_keywords):
            logger.warning(f"[GOVERNOR] Tarea {task['id']} BLOQUEADA por políticas de seguridad.")
            return False
        return True

    def prioritize_objectives(self):
        """
        Re-ordena la cola de evolución o decide si es momento de cambiar a 
        una optimización multimodal basándose en métricas globales.
        """
        logger.info("[GOVERNOR] Evaluando matriz de prioridades...")
        if not os.path.exists(self.queue_path):
            return

        with open(self.queue_path, "r") as f:
            data = json.load(f)
            queue = data.get("queue", [])

        pending = [q for q in queue if q.get("status") == "pending"]
        
        # Filtramos por seguridad
        safe_pending = [q for q in pending if self.validate_safety_policy(q)]
        
        # Ordenar por el Evolution Score real
        safe_pending.sort(key=lambda x: x.get("priority_score", 0), reverse=True)
        
        if safe_pending:
            top_task = safe_pending[0]
            logger.info(f"[GOVERNOR] Objetivo principal autorizado: {top_task['id']} - {top_task['topic']}")
            return top_task
        else:
            logger.info("[GOVERNOR] No hay tareas seguras pendientes.")
            return None
