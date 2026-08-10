import logging
import datetime
import json
from evolution.research_agent import ResearchAgent
from evolution.hypothesis_generator import HypothesisGenerator
from evolution.sandbox_evaluator import SandboxEvaluator
from evolution.memory_integration import MemoryIntegration

logger = logging.getLogger(__name__)

class EvolutionOrchestrator:
    def __init__(self):
        self.researcher = ResearchAgent()
        self.hypothesis_gen = HypothesisGenerator(model="qwen2.5-coder:7b")
        self.sandbox = SandboxEvaluator(timeout_seconds=45)
        self.memory = MemoryIntegration()

    def run_evolution_cycle(self, topic: str):
        logger.info(f"=== INICIANDO CICLO DE EVOLUCIÓN: {topic} ===")
        
        # 1. Research
        logger.info("Fase 1: Investigación Mundial...")
        research_data = self.researcher.research_topic(topic)
        
        # 2. Hypothesis & Reasoning
        logger.info("Fase 2: Razonamiento e Hipótesis...")
        hypothesis_data = self.hypothesis_gen.generate_hypothesis(topic, research_data)
        
        theory = hypothesis_data.get("theory", "Error")
        script = hypothesis_data.get("script_code", "")
        metric = hypothesis_data.get("success_metric", "N/A")
        
        logger.info(f"Teoría propuesta: {theory}")
        
        if not script:
            logger.error("No se generó script. Abortando.")
            return "FAIL"
            
        # 3 & 4. Experiment Sandbox & Verification
        logger.info("Fase 3 & 4: Sandbox & Verificación...")
        result = self.sandbox.run_experiment(script, metric)
        
        status = result["status"]
        evidence_score = result["evidence_score"]
        
        logger.info(f"Resultado de Verificación: {status} (Evidence: {evidence_score})")
        if status == "PASS":
            logger.info(f"Stdout:\n{result['stdout']}")
        else:
            logger.info(f"Stderr:\n{result['stderr']}")
            
        # 5. Memory & Proposal
        logger.info("Fase 5: Integración de Memoria...")
        if status == "PASS":
            success = self.memory.save_verified_knowledge(
                topic=topic,
                hypothesis=theory,
                experiment_result=f"PASS. Tiempo de exec: {result['execution_time']:.4f}s",
                evidence_score=evidence_score
            )
            if success:
                logger.info("🎉 Ciclo exitoso. Conocimiento asimilado en la base de datos principal.")
            else:
                logger.warning("El ciclo pasó, pero la memoria rechazó el conocimiento.")
        else:
            # Guardamos el aprendizaje negativo en memoria también
            self.memory.save_verified_knowledge(
                topic=topic,
                hypothesis=theory,
                experiment_result=f"FAIL. Error: {result['stderr'][:100]}",
                evidence_score=0.85 # La evidencia del fracaso es útil
            )
            logger.info("El experimento no pasó. Se registró la lección de fallo en memoria.")
            
        logger.info("=== FIN DEL CICLO DE EVOLUCIÓN ===")
        return status
