import chromadb
import uuid
import datetime
import logging

logger = logging.getLogger(__name__)

class MemoryIntegration:
    def __init__(self, db_path="/home/angel/nexa-core/memory_db", collection_name="nexa_long_term_memory"):
        self.client = chromadb.PersistentClient(path=db_path)
        # Create or get collection
        self.collection = self.client.get_or_create_collection(name=collection_name)

    def save_verified_knowledge(self, topic: str, hypothesis: str, experiment_result: str, evidence_score: float):
        """
        Guarda el conocimiento en ChromaDB SOLO si ha sido verificado empíricamente.
        """
        if evidence_score < 0.8:
            logger.warning(f"Rechazado: Evidence score ({evidence_score}) insuficiente para memorizar.")
            return False

        doc_id = str(uuid.uuid4())
        
        # El documento es una destilación del aprendizaje
        document = f"Conocimiento verificado sobre {topic}: {hypothesis}. Resultado empírico: {experiment_result}."
        
        # Metadatos estrictos
        metadata = {
            "source": "evolution_engine",
            "topic": topic,
            "evidence_score": evidence_score,
            "verification_date": datetime.datetime.now().isoformat(),
            "status": "verified"
        }
        
        try:
            self.collection.add(
                ids=[doc_id],
                documents=[document],
                metadatas=[metadata]
            )
            logger.info(f"✅ Conocimiento memorizado exitosamente en ChromaDB. ID: {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Error guardando en memoria: {e}")
            return False
