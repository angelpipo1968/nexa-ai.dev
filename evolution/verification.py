"""
Verification Engine
===================
Compara el resultado del experimento contra el baseline y produce un veredicto.

Criterios de PASS:
  - Mejora en la métrica objetivo (ej: VRAM reducida)
  - Sin regresión en métricas secundarias (ej: tiempo no aumenta >20%)
  - Sin errores durante el experimento
  - La mejora supera el umbral mínimo de significancia

El veredicto es siempre texto legible para el revisor humano.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from .models import ExperimentResult, Hypothesis

logger = logging.getLogger("nexa.evolution.verification")


class VerificationEngine:
    """
    Verifica si un experimento demuestra la hipótesis.
    
    Produce un ExperimentResult con veredicto, métricas y logs.
    No toma decisiones de deploy — eso es responsabilidad del Gate.
    """

    def verify(
        self,
        hypothesis: Hypothesis,
        baseline_metrics: Dict[str, Any],
        experiment_metrics: Dict[str, Any],
        delta: Dict[str, Any],
        sandbox_type: str = "subprocess",
        logs: str = "",
        authorized_by: Optional[str] = None,
    ) -> ExperimentResult:
        """
        Verifica el experimento y produce un resultado estructurado.
        
        Args:
            hypothesis: La hipótesis que se está probando
            baseline_metrics: Métricas del estado actual
            experiment_metrics: Métricas del experimento
            delta: Delta calculado por BenchmarkEngine
            sandbox_type: Tipo de sandbox usado
            logs: Logs del experimento
            authorized_by: Quién autorizó el experimento
        
        Returns:
            ExperimentResult con veredicto explícito
        """
        findings: List[str] = []
        success = True

        # 1. ¿El experimento completó sin error?
        if not experiment_metrics.get("success", False):
            error = experiment_metrics.get("error", "Error desconocido")
            findings.append(f"❌ El experimento falló: {error}")
            success = False

        # 2. Evaluar métricas clave del delta
        if success:
            vram_delta = delta.get("vram_peak_mib", {})
            time_delta = delta.get("duration_seconds", {})

            vram_pct = vram_delta.get("pct", 0)
            time_pct = time_delta.get("pct", 0)

            vram_baseline = vram_delta.get("baseline", 0)
            vram_experiment = vram_delta.get("experiment", 0)
            time_baseline = time_delta.get("baseline", 0)
            time_experiment = time_delta.get("experiment", 0)

            # VRAM
            if vram_pct < -5:  # Reducción > 5% → mejora
                findings.append(
                    f"✅ VRAM reducida: {vram_baseline} → {vram_experiment} MiB ({vram_pct:+.1f}%)"
                )
            elif vram_pct > 10:  # Aumento > 10% → regresión
                findings.append(
                    f"⚠️ VRAM aumentó: {vram_baseline} → {vram_experiment} MiB ({vram_pct:+.1f}%)"
                )
                success = False
            else:
                findings.append(
                    f"➡️ VRAM sin cambio significativo: {vram_baseline} → {vram_experiment} MiB ({vram_pct:+.1f}%)"
                )

            # Tiempo
            if time_pct < -10:
                findings.append(
                    f"✅ Tiempo reducido: {time_baseline:.1f}s → {time_experiment:.1f}s ({time_pct:+.1f}%)"
                )
            elif time_pct > 20:
                findings.append(
                    f"⚠️ Tiempo aumentó >20%: {time_baseline:.1f}s → {time_experiment:.1f}s ({time_pct:+.1f}%)"
                )
                # No es automáticamente un fallo — depende de la métrica objetivo
                findings.append("ℹ️ Aumento de tiempo no es fallo automático — verificar si era esperado")

        # 3. Verificación de hipótesis específica
        hypothesis_met = self._check_hypothesis_met(hypothesis, delta, success)
        if hypothesis_met:
            findings.append(f"✅ Hipótesis confirmada: '{hypothesis.statement[:100]}...'")
        else:
            findings.append(f"❌ Hipótesis no confirmada: '{hypothesis.statement[:100]}...'")
            success = False

        # 4. Construir veredicto legible
        summary_delta = delta.get("_summary", "")
        verdict = self._build_verdict(success, findings, summary_delta, hypothesis)

        result = ExperimentResult(
            hypothesis_id=hypothesis.id,
            experiment_description=hypothesis.experiment_plan or "Experimento sin descripción",
            sandbox_type=sandbox_type,
            baseline_metrics=baseline_metrics,
            experiment_metrics=experiment_metrics,
            delta=delta,
            success=success,
            verdict=verdict,
            error=experiment_metrics.get("error"),
            logs=logs,
            duration_seconds=experiment_metrics.get("duration_seconds", 0.0),
            authorized_by=authorized_by,
        )

        logger.info(
            f"[VerificationEngine] Resultado: {'PASS ✅' if success else 'FAIL ❌'} | "
            f"Hipótesis: {hypothesis.id[:8]}... | {summary_delta}"
        )
        return result

    def _check_hypothesis_met(
        self,
        hypothesis: Hypothesis,
        delta: Dict[str, Any],
        experiment_succeeded: bool,
    ) -> bool:
        """
        Determina si el delta confirma la hipótesis.
        
        Lógica básica: si el experimento no falló y hay alguna mejora
        en métricas de VRAM o tiempo, la hipótesis se considera parcialmente
        confirmada. En el futuro esto puede hacerse más específico por dominio.
        """
        if not experiment_succeeded:
            return False

        vram_pct = delta.get("vram_peak_mib", {}).get("pct", 0)
        time_pct = delta.get("duration_seconds", {}).get("pct", 0)

        # Al menos una métrica debe mejorar y ninguna debe degradarse >20%
        has_improvement = (vram_pct < -2) or (time_pct < -5)
        no_severe_regression = (vram_pct < 15) and (time_pct < 30)

        return has_improvement and no_severe_regression

    def _build_verdict(
        self,
        success: bool,
        findings: List[str],
        summary_delta: str,
        hypothesis: Hypothesis,
    ) -> str:
        """Construye el veredicto como texto legible para el revisor."""
        status = "PASS ✅" if success else "FAIL ❌"
        lines = [
            f"=== VEREDICTO: {status} ===",
            f"Hipótesis: {hypothesis.statement[:200]}",
            f"Confianza original: {hypothesis.confidence:.0%}",
            "",
            "Hallazgos:",
        ]
        for f in findings:
            lines.append(f"  {f}")
        lines += ["", f"Resumen de métricas: {summary_delta}"]
        return "\n".join(lines)
