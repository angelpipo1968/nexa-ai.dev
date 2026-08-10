"""
NEXA Evolution Engine
=====================
Ciclo de evolución controlada y auditable integrado en nexa-core.

Componentes:
  - ResearchEngine   : búsqueda multi-fuente + extracción de evidencia estructurada
  - ReasoningEngine  : contraste, detección de conflictos, confidence scoring
  - Hypothesis       : modelo de datos para hipótesis y experimentos
  - Sandbox          : ejecución aislada con Git branch + métricas
  - BenchmarkEngine  : VRAM, tiempo, calidad
  - Verification     : comparación baseline vs experimento
  - Proposal         : artefacto legible para revisión humana
  - Gate             : aprobación explícita antes de cualquier merge
  - EvolutionCycle   : orquestador principal

Principio fundamental:
  Descubrir ≠ Aceptar.
  Una mejora propuesta no es válida hasta ser demostrada y aprobada.
"""

from .models import Evidence, Hypothesis, ExperimentResult, Proposal, ProposalStatus
from .research_engine import ResearchEngine
from .reasoning_engine import ReasoningEngine
from .benchmark import BenchmarkEngine
from .verification import VerificationEngine
from .gate import EvolutionGate
from .cycle import EvolutionCycle

__all__ = [
    "Evidence",
    "Hypothesis",
    "ExperimentResult",
    "Proposal",
    "ProposalStatus",
    "ResearchEngine",
    "ReasoningEngine",
    "BenchmarkEngine",
    "VerificationEngine",
    "EvolutionGate",
    "EvolutionCycle",
]
