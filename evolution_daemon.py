import asyncio
import logging
import sys
import traceback
from datetime import datetime
import time

# Logging para el servicio systemd y archivo persistente
logger = logging.getLogger("nexa.evolution.daemon")
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Output a stdout para systemd
stdout_handler = logging.StreamHandler(sys.stdout)
stdout_handler.setFormatter(formatter)
logger.addHandler(stdout_handler)

# Output a archivo persistente
file_handler = logging.FileHandler("/home/angel/nexa-core/evolution.log")
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

from evolution.cycle import EvolutionCycle
from evolution.gate import EvolutionGate

# Ciclo por defecto cada 6 horas
SLEEP_HOURS = 6

async def run_daemon():
    logger.info("="*80)
    logger.info("🚀 STARTING NEXA AUTONOMOUS EVOLUTION DAEMON")
    logger.info(f"Ciclo configurado para cada {SLEEP_HOURS} horas.")
    logger.info("="*80)
    
    cycle = EvolutionCycle()
    
    while True:
        try:
            logger.info("--- 🔄 INICIANDO NUEVO CICLO DE EVOLUCIÓN ---")
            
            # auto_generate_queries=True para que NEXA decida qué investigar.
            # En la versión productiva, el backend/analítica le pasará telemetry o logs,
            # pero por defecto el LLM generará la pregunta si no se provee.
            
            # Dejamos la pregunta en None para que sea completamente autónomo 
            # asumiendo que el Motor de Investigación puede detectar problemas, 
            # pero de momento le daremos un topic abierto basado en optimization.
            
            # Simulamos que el sistema extrae "hot topics" de los logs (P4.6, GPU, etc.)
            topic = "How to improve generation speed and lower VRAM of open weights AI video models like LTX-Video and CogVideo"
            
            logger.info(f"[Daemon] Tema actual: {topic}")
            
            result = await cycle.run(
                research_question=topic,
                auto_generate_queries=True
            )
            
            logger.info(f"[Daemon] Resultado del ciclo:\n{result.summary()}")
            
            if result.proposal:
                logger.info(f"[Daemon] 📋 Proposal {result.proposal.id} generada y pendiente de aprobación.")
                # Aquí podríamos notificar por Slack/Webhook.
            else:
                logger.info("[Daemon] 🛑 Ciclo finalizado sin nueva proposal (Inconclusive/No evidence).")
                
        except Exception as e:
            logger.error(f"[Daemon] ❌ Error fatal en el ciclo de evolución: {str(e)}")
            logger.error(traceback.format_exc())
            # Evita un fallo silencioso rápido
            logger.info("Esperando 1 hora tras fallo crítico antes de reintentar...")
            await asyncio.sleep(3600)
            continue
            
        logger.info(f"[Daemon] 💤 Durmiendo {SLEEP_HOURS} horas hasta el siguiente ciclo...")
        # Dormimos N horas
        await asyncio.sleep(SLEEP_HOURS * 3600)

if __name__ == "__main__":
    try:
        asyncio.run(run_daemon())
    except KeyboardInterrupt:
        logger.info("[Daemon] Detenido por señal externa (SIGINT)")
        sys.exit(0)
    except Exception as e:
        logger.critical(f"[Daemon] ❌ Excepción crítica de nivel superior: {str(e)}")
        sys.exit(1)
