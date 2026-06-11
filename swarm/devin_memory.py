import hashlib
import json
import os
from typing import Any, Dict, List, Optional

import requests


def embed(text: str, dim: int = 16) -> List[float]:
    h = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()
    vals: List[float] = []
    for i in range(dim):
        b = h[i % len(h)]
        vals.append((float(b) / 255.0) * 2.0 - 1.0)
    return vals


class QdrantMemory:
    def __init__(self, base_url: str, collection: str = "project_memory", dim: int = 16) -> None:
        self.base_url = base_url.rstrip("/")
        self.collection = collection
        self.dim = dim

    def ensure(self) -> None:
        r = requests.get(f"{self.base_url}/collections/{self.collection}", timeout=10)
        if r.status_code == 200:
            return
        payload = {"vectors": {"size": self.dim, "distance": "Cosine"}}
        requests.put(f"{self.base_url}/collections/{self.collection}", json=payload, timeout=30).raise_for_status()

    def upsert(self, *, id: str, text: str, payload: Dict[str, Any]) -> None:
        self.ensure()
        vec = embed(text, dim=self.dim)
        body = {"points": [{"id": id, "vector": vec, "payload": {"text": text, **payload}}]}
        requests.put(
            f"{self.base_url}/collections/{self.collection}/points",
            json=body,
            timeout=30,
        ).raise_for_status()

    def search(self, *, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        self.ensure()
        vec = embed(query, dim=self.dim)
        body = {"vector": vec, "limit": limit, "with_payload": True}
        r = requests.post(f"{self.base_url}/collections/{self.collection}/points/search", json=body, timeout=30)
        r.raise_for_status()
        data = r.json()
        return data.get("result", [])


def get_memory() -> Optional[QdrantMemory]:
    url = os.environ.get("QDRANT_URL", "").strip()
    if not url:
        return None
    return QdrantMemory(url)
