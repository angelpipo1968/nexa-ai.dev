"""
Evolution Cycle
===============
Orquestador principal del ciclo de evolución controlada.

Implementa el loop completo:
  OBSERVE → RESEARCH → REASON → EXPERIMENT (con autorización) → VERIFY → PROPOSE

Uso:
    cycle = EvolutionCycle()
    result = await cycle.run("¿Cómo reducir el consumo de VRAM de LTX-2.3?")
    # result contiene: hypothesis, evidence, proposal (si aplica)

El ciclo NO ejecuta experimentos automáticamente.
Los experimentos requieren autorización vía EvolutionGate.
"""

from __future__ import annotations

import asyncio
import logging
import sys
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .models import Evidence, Hypothesis, Proposal, ProposalStatus
from .research_engine import ResearchEngine
from .reasoning_engine import ReasoningEngine
from .benchmark import BenchmarkEngine
from .verification import VerificationEngine
from .gate import EvolutionGate

logger = logging.getLogger("nexa.evolution.cycle")


class CycleResult:
    """Resultado de un ciclo de evolución completo."""

    def __init__(
        self,
        research_question: str,
        evidence: List[Evidence],
        hypothesis: Hypothesis,
        proposal: Optional[Proposal] = None,
        status: str = "completed",
        message: str = "",
    ):
        self.research_question = research_question
        self.evidence = evidence
        self.hypothesis = hypothesis
        self.proposal = proposal
        self.status = status
        self.message = message
        self.timestamp = datetime.utcnow()

    def summary(self) -> str:
        lines = [
            f"╔═══════════════════════════════════════════════════════════╗",
            f"║ NEXA EVOLUTION CYCLE RESULT                               ║",
            f"╠═══════════════════════════════════════════════════════════╣",
            f"║ Pregunta: {self.research_question[:55]:<55} ║",
            f"║ Estado:   {self.status:<55} ║",
            f"╠═══════════════════════════════════════════════════════════╣",
            f"║ INVESTIGACIÓN                                             ║",
            f"║   Evidencias recopiladas: {len(self.evidence):<37} ║",
        ]

        # Regiones
        regions = list(set(ev.region for ev in self.evidence if ev.region))
        lines.append(f"║   Regiones: {', '.join(regions):<49} ║")

        # Tipos de fuente
        types = {}
        for ev in self.evidence:
            types[ev.evidence_type.value] = types.get(ev.evidence_type.value, 0) + 1
        type_str = ", ".join(f"{k}:{v}" for k, v in types.items())
        lines.append(f"║   Tipos: {type_str:<52} ║")

        lines += [
            f"╠═══════════════════════════════════════════════════════════╣",
            f"║ RAZONAMIENTO                                              ║",
            f"║   Confianza: {self.hypothesis.confidence:<48.0%} ║",
            f"║   Conflictos: {len(self.hypothesis.conflicts):<47} ║",
            f"║   Experimento propuesto: {'SÍ' if self.hypothesis.experiment_plan else 'NO':<36} ║",
        ]

        if self.hypothesis.statement:
            stmt = self.hypothesis.statement[:55]
            lines.append(f"║   Hipótesis: {stmt:<48} ║")

        if self.hypothesis.uncertainty:
            unc = self.hypothesis.uncertainty[:55]
            lines.append(f"║   Incertidumbre: {unc:<44} ║")

        if self.proposal:
            lines += [
                f"╠═══════════════════════════════════════════════════════════╣",
                f"║ PROPOSAL                                                  ║",
                f"║   ID: {self.proposal.id[:8]:<55} ║",
                f"║   Estado: {self.proposal.status.value:<51} ║",
                f"║   Riesgo: {self.proposal.risk_level:<51} ║",
            ]

        lines.append(f"╚═══════════════════════════════════════════════════════════╝")
        return "\n".join(lines)


class EvolutionCycle:
    """
    Orquestador del ciclo de evolución de NEXA.
    
    Ciclo completo:
    1. Research: búsqueda multi-fuente + extracción de evidencia
    2. Reason: contraste, conflictos, confidence scoring
    3. Gate check: ¿confianza suficiente para proponer?
    4. Propose: generar Proposal para revisión humana
    5. [Cuando se apruebe] Experiment + Verify
    """

    def __init__(self):
        self.research = ResearchEngine()
        self.reasoning = ReasoningEngine()
        self.benchmark = BenchmarkEngine()
        self.verification = VerificationEngine()
        self.gate = EvolutionGate()

    async def run(
        self,
        research_question: str,
        extra_queries: Optional[List[str]] = None,
        auto_generate_queries: bool = True,
    ) -> CycleResult:
        """
        Ejecuta un ciclo completo de investigación y razonamiento.
        
        Args:
            research_question: La pregunta o mejora a investigar
            extra_queries: Queries adicionales de búsqueda
            auto_generate_queries: Si generar automáticamente queries multi-región
        
        Returns:
            CycleResult con toda la información del ciclo
        """
        logger.info(f"[EvolutionCycle] 🔍 Iniciando ciclo: '{research_question}'")

        # 1. RESEARCH — búsqueda multi-fuente
        queries = extra_queries or []
        if auto_generate_queries:
            auto_q = self.research.build_multi_regional_queries(research_question)
            queries = list(set(queries + auto_q))

        evidence = await self.research.search_async(research_question, queries)

        if not evidence:
            msg = f"Sin evidencias para: '{research_question}'"
            logger.warning(f"[EvolutionCycle] {msg}")
            hypothesis = Hypothesis(
                research_question=research_question,
                statement="Sin evidencias suficientes.",
                rationale="La búsqueda no encontró resultados relevantes.",
                confidence=0.0,
                uncertainty="Buscar con términos diferentes o en otras fuentes.",
            )
            return CycleResult(
                research_question=research_question,
                evidence=[],
                hypothesis=hypothesis,
                status="no_evidence",
                message=msg,
            )

        # 2. REASON — contraste + confidence scoring
        hypothesis = await asyncio.to_thread(
            self.reasoning.reason, research_question, evidence
        )

        # 3. GATE CHECK — ¿hay suficiente confianza para proponer?
        if not hypothesis.experiment_plan or hypothesis.confidence < 0.55:
            msg = (
                f"Confianza insuficiente ({hypothesis.confidence:.0%}) para proponer experimento. "
                f"Incertidumbre: {hypothesis.uncertainty}"
            )
            logger.info(f"[EvolutionCycle] 🤔 'No lo sé todavía' — {msg}")
            return CycleResult(
                research_question=research_question,
                evidence=evidence,
                hypothesis=hypothesis,
                status="insufficient_confidence",
                message=msg,
            )

        # 4. PROPOSE — generar proposal para revisión humana
        proposal = self._build_proposal(hypothesis, evidence)
        proposal_id = self.gate.submit(proposal)

        msg = (
            f"Proposal #{proposal_id[:8]} pendiente de revisión. "
            f"Confianza: {hypothesis.confidence:.0%}. "
            f"Riesgo: {proposal.risk_level}."
        )
        logger.info(f"[EvolutionCycle] 📋 {msg}")

        return CycleResult(
            research_question=research_question,
            evidence=evidence,
            hypothesis=hypothesis,
            proposal=proposal,
            status="proposal_pending",
            message=msg,
        )

    def _build_proposal(self, hypothesis: Hypothesis, evidence: List[Evidence]) -> Proposal:
        """Construye una Proposal legible a partir de la hipótesis."""
        # Estimar riesgo basado en confidence y tipo de cambio
        risk = "low" if hypothesis.confidence > 0.75 else "medium"
        if any("architecture" in ev.claim.lower() for ev in evidence):
            risk = "high"

        top_sources = [f"- {ev.source_name} ({ev.region}): {ev.claim[:100]}" for ev in evidence[:5]]
        improvement_evidence = {
            "confidence": hypothesis.confidence,
            "evidence_count": len(evidence),
            "conflicts": hypothesis.conflicts,
            "top_sources": top_sources,
        }

        return Proposal(
            title=f"[Evolution] {hypothesis.research_question[:80]}",
            summary=(
                f"Hipótesis: {hypothesis.statement}\n\n"
                f"Confianza: {hypothesis.confidence:.0%} basada en {len(evidence)} fuentes.\n\n"
                f"Conflictos detectados: {len(hypothesis.conflicts)}\n"
                f"{chr(10).join(hypothesis.conflicts[:3])}\n\n"
                f"Experimento propuesto:\n{hypothesis.experiment_plan}\n\n"
                f"Incertidumbre: {hypothesis.uncertainty}"
            ),
            hypothesis_id=hypothesis.id,
            experiment_result_id="pending",
            improvement_evidence=improvement_evidence,
            risk_level=risk,
            rollback_plan="Revertir cambio y restaurar configuración anterior.",
        )

    async def run_experiment(
        self,
        proposal_id: str,
        experiment_fn,
        baseline_fn,
        authorized_by: str = "human",
    ) -> Dict[str, Any]:
        """
        Ejecuta un experimento para una proposal APROBADA.
        
        REQUIERE que la proposal esté en estado APPROVED.
        Mide baseline, ejecuta experimento, verifica resultado.
        """
        proposal = self.gate.get(proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} no encontrada")
        if proposal.status != ProposalStatus.APPROVED:
            raise ValueError(
                f"Proposal {proposal_id} no está aprobada (estado: {proposal.status}). "
                "Debe aprobarse via gate.approve() antes de ejecutar el experimento."
            )

        hypothesis = Hypothesis(
            id=proposal.hypothesis_id,
            research_question=proposal.title,
            statement=proposal.summary[:200],
            confidence=proposal.improvement_evidence.get("confidence", 0.5),
            experiment_plan=proposal.summary,
        )

        # Medir baseline
        logger.info(f"[EvolutionCycle] 📊 Midiendo baseline para proposal #{proposal_id[:8]}")
        baseline_metrics = self.benchmark.capture("Baseline", baseline_fn)

        # Ejecutar experimento
        logger.info(f"[EvolutionCycle] 🧪 Ejecutando experimento para proposal #{proposal_id[:8]}")
        experiment_metrics = self.benchmark.capture("Experimento", experiment_fn)

        # Calcular delta
        delta = self.benchmark.compute_delta(baseline_metrics, experiment_metrics)

        # Verificar
        exp_result = self.verification.verify(
            hypothesis=hypothesis,
            baseline_metrics=baseline_metrics,
            experiment_metrics=experiment_metrics,
            delta=delta,
            authorized_by=authorized_by,
        )

        logger.info(f"[EvolutionCycle] {'✅ PASS' if exp_result.success else '❌ FAIL'}")
        return {
            "proposal_id": proposal_id,
            "experiment_result": exp_result,
            "verdict": exp_result.verdict,
            "pass": exp_result.success,
        }
