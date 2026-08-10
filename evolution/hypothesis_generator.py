import json
import logging
import sys
import os

# Asegurar que podamos importar módulos de nexa-core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ollama_backend import OllamaBackend

logger = logging.getLogger(__name__)

class HypothesisGenerator:
    def __init__(self, model="qwen2.5-coder:7b"):
        self.llm = OllamaBackend()
        self.model = model

    def generate_hypothesis(self, topic: str, research_data: str) -> dict:
        """
        Usa el LLM para razonar sobre los datos de investigación y proponer un experimento.
        """
        logger.info(f"Razonando hipótesis con {self.model} para: '{topic}'")
        
        prompt = f"""
Eres el NEXA Reasoning Engine. Tu tarea es analizar la investigación proporcionada y generar un experimento de optimización seguro.

TEMA A OPTIMIZAR:
{topic}

INVESTIGACIÓN RECOPILADA:
{research_data}

INSTRUCCIONES:
1. Formula una teoría clara basada en la investigación.
2. Escribe un script de benchmark en Python que pruebe esta teoría en una RTX 3090.
   - REGLAS ESTRICTAS DEL SCRIPT:
     * Solo puedes importar: torch, time, os, numpy, vllm, transformers.
     * El script NO debe borrar archivos, ni descargar cosas pesadas de internet (usa un modelo dummy local como 'Qwen/Qwen2.5-0.5B' o tensores generados al azar).
     * El script debe ejecutarse y terminar en menos de 20 segundos.
     * El script debe imprimir el resultado de forma clara. Si el resultado es bueno y el experimento funciona, debe terminar con exit code 0. Si falla o es muy lento, exit code 1 (sys.exit(1)).
3. Define la métrica de éxito.

Devuelve ÚNICAMENTE un objeto JSON válido con este formato:
{{
  "theory": "tu hipótesis",
  "script_code": "el código completo en python",
  "success_metric": "qué significa que pase el test"
}}
"""
        
        try:
            response = self.llm.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048,
                temperature=0.2
            )
            
            if not response.get("success"):
                logger.error(f"Error del LLM: {response.get('error')}")
                return self._fallback_hypothesis()
                
            content = response.get("content", "")
            
            # Limpiar posible markdown en la respuesta
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
                
            data = json.loads(content.strip())
            return data
            
        except Exception as e:
            logger.error(f"Fallo al parsear la hipótesis del LLM: {e}")
            return self._fallback_hypothesis()
            
    def _fallback_hypothesis(self) -> dict:
        logger.warning("Usando hipótesis de contingencia (fallback).")
        return {
            "theory": "Activar torch.backends.cudnn.benchmark puede mejorar rendimiento.",
            "script_code": "import torch, sys, time\ntorch.backends.cudnn.benchmark = True\nsys.exit(0)",
            "success_metric": "Exit code 0"
        }

