"""
Evolution Gate
==============
Gate de autorización humana.

Ningún resultado de experimento puede modificar producción
sin pasar por este gate. Los proposals se almacenan en Redis
(con fallback a JSON local) y esperan revisión explícita.

API:
  gate.submit(proposal) → str (proposal_id)
  gate.approve(proposal_id, by) → Proposal
  gate.reject(proposal_id, by, notes) → Proposal
  gate.list_pending() → List[Proposal]
  gate.get(proposal_id) → Optional[Proposal]
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime
from typing import List, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .models import Proposal, ProposalStatus

logger = logging.getLogger("nexa.evolution.gate")

# Directorio local para proposals si Redis no está disponible
PROPOSALS_DIR = os.path.join(os.path.dirname(__file__), "proposals")


class EvolutionGate:
    """
    Gate de autorización para proposals de evolución.
    
    Almacena proposals en Redis (key: evolution:proposal:{id})
    con fallback a archivos JSON en evolution/proposals/.
    
    REGLA: ningún código generado se ejecuta en producción
    sin aprobación explícita vía gate.approve().
    """

    def __init__(self):
        self._redis = self._init_redis()
        os.makedirs(PROPOSALS_DIR, exist_ok=True)
        logger.info(f"[Gate] Backend: {'Redis' if self._redis else 'JSON local'}")

    def _init_redis(self):
        try:
            import redis
            r = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)
            r.ping()
            return r
        except Exception:
            logger.info("[Gate] Redis no disponible — usando JSON local")
            return None

    # ------------------------------------------------------------------
    # Persistencia
    # ------------------------------------------------------------------

    def _save(self, proposal: Proposal):
        data = proposal.model_dump_json()
        if self._redis:
            self._redis.set(f"evolution:proposal:{proposal.id}", data)
            self._redis.sadd("evolution:proposals", proposal.id)
        else:
            path = os.path.join(PROPOSALS_DIR, f"{proposal.id}.json")
            with open(path, "w") as f:
                f.write(data)

    def _load(self, proposal_id: str) -> Optional[Proposal]:
        if self._redis:
            raw = self._redis.get(f"evolution:proposal:{proposal_id}")
            if raw:
                return Proposal.model_validate_json(raw)
        else:
            path = os.path.join(PROPOSALS_DIR, f"{proposal_id}.json")
            if os.path.exists(path):
                with open(path) as f:
                    return Proposal.model_validate_json(f.read())
        return None

    def _all_ids(self) -> List[str]:
        if self._redis:
            return list(self._redis.smembers("evolution:proposals"))
        else:
            return [
                f.replace(".json", "")
                for f in os.listdir(PROPOSALS_DIR)
                if f.endswith(".json")
            ]

    # ------------------------------------------------------------------
    # API pública
    # ------------------------------------------------------------------

    def submit(self, proposal: Proposal) -> str:
        """Registra una nueva proposal. Devuelve el proposal_id."""
        self._save(proposal)
        logger.info(
            f"[Gate] 📋 Proposal #{proposal.id[:8]} registrada: '{proposal.title}' "
            f"[riesgo: {proposal.risk_level}]"
        )
        return proposal.id

    def approve(self, proposal_id: str, by: str = "human") -> Proposal:
        """
        Aprueba una proposal.
        
        Nota: La aprobación NO ejecuta ningún cambio automáticamente.
        El deploy debe ser iniciado explícitamente por un operador.
        """
        proposal = self._load(proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} no encontrada")
        if proposal.status != ProposalStatus.PENDING:
            raise ValueError(f"Proposal {proposal_id} ya está en estado {proposal.status}")

        proposal.status = ProposalStatus.APPROVED
        proposal.reviewed_at = datetime.utcnow()
        proposal.reviewed_by = by
        self._save(proposal)
        logger.info(f"[Gate] ✅ Proposal #{proposal_id[:8]} APROBADA por {by}")
        return proposal

    def reject(self, proposal_id: str, by: str = "human", notes: str = "") -> Proposal:
        """Rechaza una proposal con notas opcionales."""
        proposal = self._load(proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} no encontrada")

        proposal.status = ProposalStatus.REJECTED
        proposal.reviewed_at = datetime.utcnow()
        proposal.reviewed_by = by
        proposal.review_notes = notes
        self._save(proposal)
        logger.info(f"[Gate] ❌ Proposal #{proposal_id[:8]} RECHAZADA por {by}: {notes}")
        return proposal

    def list_pending(self) -> List[Proposal]:
        """Lista todas las proposals en estado PENDING."""
        result = []
        for pid in self._all_ids():
            p = self._load(pid)
            if p and p.status == ProposalStatus.PENDING:
                result.append(p)
        return sorted(result, key=lambda x: x.created_at)

    def list_all(self) -> List[Proposal]:
        """Lista todas las proposals."""
        result = []
        for pid in self._all_ids():
            p = self._load(pid)
            if p:
                result.append(p)
        return sorted(result, key=lambda x: x.created_at, reverse=True)

    def get(self, proposal_id: str) -> Optional[Proposal]:
        """Obtiene una proposal por ID."""
        return self._load(proposal_id)
