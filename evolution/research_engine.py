"""
Research Engine
===============
Búsqueda multi-fuente con extracción de evidencia estructurada.

Principio: Internet proporciona evidencia, no autoridad.
Cada resultado se convierte en un objeto Evidence con procedencia,
tipo, claim extraído y nivel de reproducibilidad.
"""

from __future__ import annotations

import asyncio
import logging
import re
import sys
import os
from typing import List, Optional
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .models import Evidence, EvidenceType

logger = logging.getLogger("nexa.evolution.research")


def _detect_region(url: str) -> Optional[str]:
    """Infiere la región geográfica a partir del TLD o del dominio."""
    tld_map = {
        ".jp": "JP", ".cn": "CN", ".de": "DE", ".fr": "FR",
        ".uk": "GB", ".co.uk": "GB", ".es": "ES", ".it": "IT",
        ".kr": "KR", ".ru": "RU", ".br": "BR", ".in": "IN",
        ".au": "AU", ".ca": "CA",
    }
    try:
        host = urlparse(url).hostname or ""
        for suffix, region in tld_map.items():
            if host.endswith(suffix):
                return region
        return "US"  # Default anglosajón si no hay TLD específico
    except Exception:
        return None


def _classify_source(url: str, snippet: str) -> EvidenceType:
    """Clasifica el tipo de fuente por URL y contenido."""
    url_lower = url.lower()
    snippet_lower = snippet.lower()

    if any(x in url_lower for x in ["arxiv.org", "semanticscholar", "pubmed", "acm.org", "ieee.org"]):
        return EvidenceType.PAPER
    if any(x in url_lower for x in ["github.com", "gitlab.com", "huggingface.co"]):
        return EvidenceType.REPO
    if any(x in url_lower for x in ["docs.", "documentation", "readthedocs", "wiki"]):
        return EvidenceType.DOCUMENTATION
    if any(x in url_lower for x in ["reddit.com", "stackoverflow", "forum", "discuss"]):
        return EvidenceType.FORUM
    if any(x in snippet_lower for x in ["benchmark", "evaluation", "performance", "latency", "throughput"]):
        return EvidenceType.BENCHMARK
    return EvidenceType.UNKNOWN


def _extract_claim(snippet: str, max_chars: int = 300) -> str:
    """Extrae la afirmación principal de un snippet de texto."""
    # Tomar la primera oración relevante o los primeros 300 chars
    sentences = re.split(r'(?<=[.!?])\s+', snippet.strip())
    claim = sentences[0] if sentences else snippet[:max_chars]
    return claim[:max_chars].strip()


class ResearchEngine:
    """
    Motor de investigación multi-fuente.
    
    Usa DuckDuckGo como fuente primaria (sin API key) con posibilidad
    de añadir Brave/Tavily/SerpAPI como fuentes adicionales.
    
    Cada resultado se convierte en Evidence estructurado con:
    - source_url, source_name, region
    - evidence_type (paper, repo, docs, forum, benchmark)
    - claim extraído
    - raw_snippet (texto original)
    - confidence_raw inicial (se refina en ReasoningEngine)
    """

    def __init__(self, max_results_per_query: int = 8):
        self.max_results = max_results_per_query
        self._ddg = None
        self._init_search()

    def _init_search(self):
        """Inicializa el motor de búsqueda disponible."""
        try:
            from duckduckgo_search import DDGS
            self._ddg = DDGS()
            logger.info("[ResearchEngine] DuckDuckGo DDGS inicializado")
        except ImportError:
            try:
                from langchain_community.tools import DuckDuckGoSearchRun
                self._ddg_lc = DuckDuckGoSearchRun()
                logger.info("[ResearchEngine] DuckDuckGo LangChain inicializado (fallback)")
            except ImportError:
                logger.warning("[ResearchEngine] DuckDuckGo no disponible — usando web_scraper")
                self._ddg = None

    def _search_ddgs(self, query: str, region: str = "wt-wt") -> List[dict]:
        """Busca con duckduckgo_search DDGS (preferido, más control)."""
        try:
            results = list(self._ddg.text(query, region=region, max_results=self.max_results))
            return results
        except Exception as e:
            logger.warning(f"[ResearchEngine] DDGS error: {e}")
            return []

    def _search_nexa_tool(self, query: str) -> List[dict]:
        """Usa el web_search tool existente de NEXA como fallback."""
        try:
            from skills.web_search import perform_search
            raw = perform_search(query, max_results=self.max_results)
            # Convertir texto a lista de dicts mínimos
            if raw:
                return [{"title": query, "body": raw[:2000], "href": "internal://nexa-search"}]
        except Exception as e:
            logger.warning(f"[ResearchEngine] nexa web_search fallback error: {e}")
        return []

    def search(self, query: str, extra_queries: List[str] = None) -> List[Evidence]:
        """
        Ejecuta búsqueda principal + queries adicionales.
        
        Args:
            query: Consulta principal
            extra_queries: Queries complementarias (otras regiones, ángulos)
        
        Returns:
            Lista de Evidence estructurada y deduplicada
        """
        all_results: List[dict] = []
        queries = [query] + (extra_queries or [])

        for q in queries:
            logger.info(f"[ResearchEngine] Buscando: '{q}'")
            if self._ddg:
                results = self._search_ddgs(q)
            else:
                results = self._search_nexa_tool(q)
            all_results.extend(results)

        # Deduplicar por URL
        seen_urls = set()
        evidence_list: List[Evidence] = []

        for r in all_results:
            url = r.get("href", r.get("link", r.get("url", "")))
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)

            snippet = r.get("body", r.get("snippet", r.get("text", "")))
            title = r.get("title", "")

            ev = Evidence(
                source_url=url,
                source_name=title or urlparse(url).hostname or url,
                region=_detect_region(url),
                evidence_type=_classify_source(url, snippet),
                claim=_extract_claim(snippet),
                raw_snippet=snippet[:2000],
                confidence_raw=0.5,  # Se refinará en ReasoningEngine
            )
            evidence_list.append(ev)

        logger.info(f"[ResearchEngine] {len(evidence_list)} evidencias recopiladas (queries: {len(queries)})")
        return evidence_list

    async def search_async(self, query: str, extra_queries: List[str] = None) -> List[Evidence]:
        """Versión async del método search."""
        return await asyncio.to_thread(self.search, query, extra_queries)

    def build_multi_regional_queries(self, base_question: str) -> List[str]:
        """
        Genera queries complementarias para capturar conocimiento global.
        
        Estrategia:
        - Query principal en inglés
        - Variaciones técnicas (paper, benchmark, implementation)
        - Búsquedas dirigidas a repositorios y documentación
        """
        return [
            f"{base_question} benchmark results comparison",
            f"{base_question} site:github.com implementation",
            f"{base_question} site:arxiv.org",
            f"{base_question} performance optimization technique",
        ]
