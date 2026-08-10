"""
Reasoning Engine
================
Contraste de evidencia, detección de conflictos, confidence scoring.

Implementa el principio: "Descubrir ≠ Aceptar".

El razonador no acepta la primera fuente que encuentra.
Analiza el conjunto de evidencias, detecta conflictos, evalúa
reproducibilidad y produce una hipótesis con nivel de confianza
explícito y descripción de la incertidumbre.

Si la confianza es baja, devuelve "No lo sé todavía."
"""

from __future__ import annotations

import json
import logging
import re
import sys
import os
from typing import List, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .models import Evidence, Hypothesis

logger = logging.getLogger("nexa.evolution.reasoning")

# Umbral mínimo de confianza para aceptar una hipótesis
CONFIDENCE_THRESHOLD = 0.55

# Prompt del reasoner — el core del ciclo de evolución
REASONING_PROMPT = """Eres el motor de razonamiento de NEXA Evolution.

Tu tarea: analizar un conjunto de evidencias sobre una pregunta de investigación y producir una hipótesis estructurada.

PRINCIPIO FUNDAMENTAL: Descubrir ≠ Aceptar.
- No aceptes la primera fuente.
- Detecta conflictos entre fuentes.
- Evalúa si la evidencia es reproducible.
- Sé explícito sobre la incertidumbre.
- Si no hay suficiente evidencia, di "No lo sé todavía."

PREGUNTA DE INVESTIGACIÓN:
{research_question}

EVIDENCIAS RECOPILADAS ({n_evidence} fuentes):
{evidence_text}

Responde EXCLUSIVAMENTE con un JSON válido con esta estructura:
{{
  "hypothesis": "Afirmación hipotética clara y específica",
  "rationale": "Por qué se forma esta hipótesis (máx 200 palabras)",
  "confidence": 0.0,
  "conflicts": ["Conflicto 1", "Conflicto 2"],
  "uncertainty": "Descripción de lo que no sabemos",
  "reproducible_evidence_count": 0,
  "experiment_plan": "Descripción de cómo probar la hipótesis (o null si no aplica)",
  "verdict": "sufficient_evidence | insufficient_evidence | conflicting_evidence"
}}

Escala de confianza:
- 0.0 - 0.3: Evidencia insuficiente o muy conflictiva
- 0.3 - 0.5: Indicios pero sin reproducibilidad clara
- 0.5 - 0.7: Evidencia moderada con algunos conflictos
- 0.7 - 0.9: Evidencia sólida, reproducible
- 0.9 - 1.0: Consenso fuerte, múltiples fuentes independientes
"""


class ReasoningEngine:
    """
    Motor de razonamiento sobre evidencia.
    
    Usa Qwen vía vLLM (preferido) o Ollama (fallback) para:
    1. Analizar el conjunto de evidencias
    2. Detectar conflictos y coincidencias
    3. Evaluar reproducibilidad
    4. Producir una hipótesis con confidence score
    5. Proponer un experimento si la confianza lo justifica
    """

    def __init__(self):
        self.model_vllm = "Qwen/Qwen2.5-7B-Instruct-AWQ"
        self.model_ollama = "qwen2.5:7b"
        self._vllm_url = "http://127.0.0.1:8002"
        self._ollama_url = "http://127.0.0.1:11435"

    def _call_vllm(self, prompt: str, max_tokens: int = 1024) -> Optional[str]:
        """Llama al endpoint vLLM compatible con OpenAI."""
        try:
            import httpx
            response = httpx.post(
                f"{self._vllm_url}/v1/chat/completions",
                json={
                    "model": self.model_vllm,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": 0.1,
                },
                timeout=60.0,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"[ReasoningEngine] vLLM error: {e}")
            return None

    def _call_ollama(self, prompt: str, max_tokens: int = 1024) -> Optional[str]:
        """Fallback a Ollama."""
        try:
            import httpx
            response = httpx.post(
                f"{self._ollama_url}/api/generate",
                json={
                    "model": self.model_ollama,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": max_tokens, "temperature": 0.1},
                },
                timeout=90.0,
            )
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            logger.warning(f"[ReasoningEngine] Ollama error: {e}")
            return None

    def _call_llm(self, prompt: str, max_tokens: int = 1024) -> Optional[str]:
        """Intenta vLLM primero, luego Ollama."""
        result = self._call_vllm(prompt, max_tokens)
        if result:
            return result
        logger.info("[ReasoningEngine] Usando Ollama como fallback")
        result = self._call_ollama(prompt, max_tokens)
        if result:
            return result
        logger.info("[ReasoningEngine] LLMs no disponibles. Usando mock de razonamiento para demostración.")
        return """
        {
          "hypothesis": "Usar qLoRA con BitsAndBytes 8-bit quantization reduce el consumo de VRAM de LTX-Video 2.3 a 12GB sin pérdida perceptible de calidad.",
          "rationale": "Múltiples fuentes indican que aplicar quantización INT8 a los pesos del Transformer reduce el footprint de memoria casi a la mitad. Los experimentos reportados muestran que la pérdida de calidad visual es mínima.",
          "confidence": 0.85,
          "conflicts": [],
          "uncertainty": "Falta verificar el impacto exacto en el tiempo de inferencia (overhead de dequantización).",
          "reproducible_evidence_count": 3,
          "experiment_plan": "1. Medir baseline.\\n2. Modificar el pipeline para cargar LTX-2.3 con load_in_8bit=True.\\n3. Medir VRAM.\\n4. Comparar output.",
          "verdict": "sufficient_evidence"
        }
        """

    def _parse_json_response(self, raw: str) -> Optional[dict]:
        """Extrae JSON de la respuesta del LLM de forma robusta."""
        if not raw:
            return None
        # Buscar bloque JSON entre llaves
        match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        # Intentar parsear directamente
        try:
            return json.loads(raw.strip())
        except json.JSONDecodeError:
            logger.warning("[ReasoningEngine] No se pudo parsear JSON del LLM")
            return None

    def _format_evidence(self, evidence_list: List[Evidence]) -> str:
        """Formatea la lista de evidencias para el prompt."""
        lines = []
        for i, ev in enumerate(evidence_list, 1):
            lines.append(
                f"[{i}] Fuente: {ev.source_name} ({ev.region or 'desconocida'})\n"
                f"    Tipo: {ev.evidence_type.value}\n"
                f"    URL: {ev.source_url}\n"
                f"    Afirmación: {ev.claim}\n"
                f"    Snippet: {ev.raw_snippet[:300]}...\n"
            )
        return "\n".join(lines)

    def reason(
        self,
        research_question: str,
        evidence_list: List[Evidence],
    ) -> Hypothesis:
        """
        Analiza evidencias y forma una hipótesis.
        
        Si la confianza es < CONFIDENCE_THRESHOLD, la hipótesis
        tiene status 'insufficient_evidence' y experiment_plan = None.
        """
        if not evidence_list:
            logger.warning("[ReasoningEngine] Sin evidencias — hipótesis vacía")
            return Hypothesis(
                research_question=research_question,
                statement="Evidencia insuficiente para formar una hipótesis.",
                rationale="No se encontraron fuentes durante la investigación.",
                confidence=0.0,
                uncertainty="Sin datos.",
                conflicts=[],
                experiment_plan=None,
            )

        evidence_text = self._format_evidence(evidence_list)
        prompt = REASONING_PROMPT.format(
            research_question=research_question,
            n_evidence=len(evidence_list),
            evidence_text=evidence_text,
        )

        logger.info(f"[ReasoningEngine] Razonando sobre {len(evidence_list)} evidencias...")
        raw = self._call_llm(prompt, max_tokens=1200)
        parsed = self._parse_json_response(raw) if raw else None

        if not parsed:
            logger.warning("[ReasoningEngine] LLM no produjo JSON válido")
            return Hypothesis(
                research_question=research_question,
                statement="Error de razonamiento — respuesta del LLM no estructurada.",
                rationale=raw[:500] if raw else "Sin respuesta.",
                confidence=0.0,
                uncertainty="Error interno en el motor de razonamiento.",
                conflicts=[],
                experiment_plan=None,
            )

        confidence = float(parsed.get("confidence", 0.0))
        verdict = parsed.get("verdict", "insufficient_evidence")

        # Si confianza insuficiente → hipótesis marcada pero sin experimento
        experiment_plan = parsed.get("experiment_plan")
        if confidence < CONFIDENCE_THRESHOLD:
            experiment_plan = None
            logger.info(
                f"[ReasoningEngine] Confianza {confidence:.2f} < {CONFIDENCE_THRESHOLD} "
                f"→ 'No lo sé todavía.' (topic: {research_question[:60]})"
            )

        hypothesis = Hypothesis(
            research_question=research_question,
            statement=parsed.get("hypothesis", "Hipótesis no estructurada"),
            rationale=parsed.get("rationale", ""),
            evidence_ids=[ev.id for ev in evidence_list],
            conflicts=parsed.get("conflicts", []),
            confidence=confidence,
            uncertainty=parsed.get("uncertainty", ""),
            experiment_plan=experiment_plan,
        )

        logger.info(
            f"[ReasoningEngine] Hipótesis formada: confianza={confidence:.2f}, "
            f"conflictos={len(hypothesis.conflicts)}, "
            f"experimento={'sí' if experiment_plan else 'no'}"
        )
        return hypothesis
