import logging
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ollama_backend import OllamaBackend

logger = logging.getLogger(__name__)

class SelfAnalysisEngine:
    def __init__(self, model="qwen2.5-coder:7b"):
        self.llm = OllamaBackend()
        self.model = model

    def observe_system(self) -> str:
        """
        Recolecta el estado del sistema, leyendo las últimas líneas de los logs
        críticos y el estado de la cola anterior.
        """
        log_summary = "=== SYSTEM OBSERVATION ===\n"
        
        # Leer las últimas líneas de worker.log si existe
        worker_log = "/home/angel/nexa-core/worker.log"
        if os.path.exists(worker_log):
            try:
                # Simulamos leer el tail del log
                with open(worker_log, "r") as f:
                    lines = f.readlines()
                    last_lines = lines[-50:] # últimas 50 líneas
                    log_summary += ">> worker.log (tail):\n" + "".join(last_lines) + "\n"
            except Exception as e:
                log_summary += f">> worker.log inaccesible: {e}\n"

        # Leer fallos del Sandbox
        queue_path = "/home/angel/nexa-core/evolution/evolution_queue.json"
        if os.path.exists(queue_path):
            try:
                with open(queue_path, "r") as f:
                    data = json.load(f)
                    completed = [q for q in data.get("queue", []) if q.get("status") == "completed"]
                    if completed:
                        log_summary += ">> Evoluciones recientes:\n"
                        for c in completed[-3:]:
                            log_summary += f"ID: {c['id']}, Topic: {c['topic']}, Result: {c.get('result', 'UNKNOWN')}\n"
            except Exception as e:
                pass
                
        return log_summary

    def analyze_and_propose(self, observation: str) -> list:
        """
        Pide al LLM que analice las métricas/logs y proponga objetivos de mejora.
        """
        logger.info("Realizando auto-análisis del sistema...")
        prompt = f"""
Eres el NEXA Self Analysis Engine. Tu objetivo es encontrar debilidades en el sistema basándote en los logs proporcionados y proponer misiones de mejora.

OBSERVACIONES DEL SISTEMA:
{observation}

Calcula el Evolution Score para cada propuesta usando la fórmula:
Priority = (Impact * Confidence * Reproducibility * Feasibility) / Risk
Donde todos los valores están entre 1 y 10.

Devuelve ÚNICAMENTE un array JSON válido con este formato de ejemplo, ordenado por prioridad descendente:
[
  {{
    "topic": "Resolver timeout de lectura del GPU Worker",
    "impact": 9,
    "confidence": 8,
    "reproducibility": 9,
    "feasibility": 7,
    "risk": 3,
    "priority": 15.1
  }}
]
"""
        try:
            response = self.llm.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048,
                temperature=0.3
            )
            
            content = response.get("content", "")
            # Limpiar posible markdown en la respuesta
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
                
            proposals = json.loads(content.strip())
            # Ordenar por prioridad real por si el LLM falló en eso
            proposals.sort(key=lambda x: x.get("priority", 0), reverse=True)
            return proposals
        except Exception as e:
            logger.error(f"Fallo en el auto-análisis: {e}")
            return []
