"""
Evolution Data Models
=====================
Tipos de datos compartidos por todos los componentes del ciclo de evolución.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Evidence — unidad atómica de conocimiento con procedencia
# ---------------------------------------------------------------------------

class EvidenceType(str, Enum):
    PAPER        = "paper"
    REPO         = "repo"
    DOCUMENTATION = "documentation"
    FORUM        = "forum"
    BENCHMARK    = "benchmark"
    NEWS         = "news"
    UNKNOWN      = "unknown"


class Evidence(BaseModel):
    """Una pieza de evidencia recopilada durante la investigación."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_url: str
    source_name: str
    region: Optional[str] = None          # "US", "EU", "JP", "CN", etc.
    evidence_type: EvidenceType = EvidenceType.UNKNOWN
    claim: str                             # Afirmación principal extraída
    raw_snippet: str                       # Texto original (máx 2000 chars)
    date_retrieved: datetime = Field(default_factory=datetime.utcnow)
    reproducible: Optional[bool] = None   # ¿La evidencia es reproducible?
    confidence_raw: float = 0.5           # Confianza asignada por el reasoner (0-1)
    tags: List[str] = Field(default_factory=list)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# ---------------------------------------------------------------------------
# Hypothesis — hipótesis formada a partir de evidencia
# ---------------------------------------------------------------------------

class HypothesisStatus(str, Enum):
    FORMED      = "formed"
    TESTING     = "testing"
    CONFIRMED   = "confirmed"
    REFUTED     = "refuted"
    INCONCLUSIVE = "inconclusive"


class Hypothesis(BaseModel):
    """Una hipótesis formada a partir de evidencia contrastada."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    research_question: str
    statement: str                         # La hipótesis en sí
    rationale: str                         # Por qué se formula
    evidence_ids: List[str] = Field(default_factory=list)
    conflicts: List[str] = Field(default_factory=list)  # Conflictos encontrados
    confidence: float = 0.0               # 0.0 - 1.0
    uncertainty: str = ""                 # Descripción de la incertidumbre
    experiment_plan: Optional[str] = None # Descripción del experimento propuesto
    status: HypothesisStatus = HypothesisStatus.FORMED
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# ---------------------------------------------------------------------------
# ExperimentResult — resultado de un experimento en sandbox
# ---------------------------------------------------------------------------

class ExperimentResult(BaseModel):
    """Resultado medido de un experimento ejecutado en sandbox."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hypothesis_id: str
    experiment_description: str
    sandbox_type: str = "subprocess"      # "subprocess", "docker", "git_branch"

    # Métricas capturadas
    baseline_metrics: Dict[str, Any] = Field(default_factory=dict)
    experiment_metrics: Dict[str, Any] = Field(default_factory=dict)
    delta: Dict[str, Any] = Field(default_factory=dict)  # experiment - baseline

    # Resultado
    success: bool = False
    verdict: str = ""                     # Descripción del veredicto
    error: Optional[str] = None
    logs: str = ""

    # Metadatos
    duration_seconds: float = 0.0
    executed_at: datetime = Field(default_factory=datetime.utcnow)
    authorized_by: Optional[str] = None   # Quién autorizó el experimento

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


# ---------------------------------------------------------------------------
# Proposal — propuesta de mejora para revisión humana
# ---------------------------------------------------------------------------

class ProposalStatus(str, Enum):
    PENDING  = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DEPLOYED = "deployed"
    ROLLED_BACK = "rolled_back"


class Proposal(BaseModel):
    """Propuesta de mejora lista para revisión y aprobación humana."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    summary: str                           # Resumen ejecutivo para el revisor
    hypothesis_id: str
    experiment_result_id: str

    # Qué cambiaría
    affected_files: List[str] = Field(default_factory=list)
    diff_preview: str = ""                # Diff legible (no se aplica aquí)
    rollback_plan: str = ""               # Cómo revertir si falla

    # Evidencia de mejora
    improvement_evidence: Dict[str, Any] = Field(default_factory=dict)
    risk_level: str = "medium"           # "low", "medium", "high"
    requires_restart: bool = False

    # Estado
    status: ProposalStatus = ProposalStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    review_notes: str = ""

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
