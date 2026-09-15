import redis
import json
import asyncio
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class QueueManager:
    def __init__(self):
        # Conectar al contenedor nexa-redis en la red nexa_default
        self.redis_client = redis.Redis(host='nexa-redis', port=6379, db=0, decode_responses=True)
        self.queue_name = "model_requests"
        self.processing_key = "processing_requests"
        self.max_concurrent = 1  # Limitar a 1 concurrente por GPU RTX 3090
        # Lock asyncio para proteger la sección crítica scard→sadd
        # (válido para single-worker Uvicorn; Redis sigue siendo la autoridad para multi-worker)
        self._lock = asyncio.Lock()

        # Limpiar estados residuales en caso de reinicio de la aplicación
        try:
            self.redis_client.delete(self.processing_key)
        except Exception as e:
            logger.error(f"Redis initialization error: {e}")

    async def request_turn(self, request_id: str, payload: dict) -> bool:
        """Encola y espera el turno"""
        try:
            # Sección crítica: scard→sadd debe ser atómica dentro del event loop
            async with self._lock:
                processing_count = self.redis_client.scard(self.processing_key)
                if processing_count < self.max_concurrent:
                    # Procesa de inmediato
                    self.redis_client.sadd(self.processing_key, request_id)
                    return True

            # Encola para procesar más tarde (fuera del lock)
            self.redis_client.rpush(self.queue_name, json.dumps({
                'id': request_id,
                'payload': payload,
                'timestamp': time.time()
            }))

            # Bloquear la ejecución asíncrona mediante Long-Polling hasta que sea nuestro turno
            while True:
                if self.redis_client.sismember(self.processing_key, request_id):
                    return True
                await asyncio.sleep(0.5)

        except Exception as e:
            logger.error(f"Error en cola: {e}")
            # Si falla Redis, permitir procesamiento para no bloquear (Fallback)
            return True

    async def get_next_request(self) -> Optional[dict]:
        """Obtiene la siguiente solicitud de la cola"""
        try:
            item = self.redis_client.lpop(self.queue_name)
            if item:
                return json.loads(item)
            return None
        except Exception as e:
            logger.error(f"Error obteniendo siguiente solicitud: {e}")
            return None

    async def release_turn(self, request_id: str):
        """Marca una solicitud como completada y cede el turno a la siguiente"""
        try:
            self.redis_client.srem(self.processing_key, request_id)

            # Activar el siguiente en la cola
            next_item = await self.get_next_request()
            if next_item:
                # Al añadirlo a processing_key, desbloquea el loop asyncio del peticionario original
                self.redis_client.sadd(self.processing_key, next_item['id'])
                return next_item
            return None
        except Exception as e:
            logger.error(f"Error completando solicitud: {e}")
            return None
