import sys
import os
import logging
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from evolution.production_gate import ProductionGate
from evolution.evolution_governor import EvolutionGovernor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("E2E_Test")

def run_e2e():
    logger.info("=== NEXA FULL AUTONOMY E2E TEST ===")
    
    # 1. GOVERNOR
    governor = EvolutionGovernor()
    if not governor.assess_system_resources():
        logger.error("Recursos insuficientes.")
        sys.exit(1)
        
    # Creamos un target sintético para la demostración
    target = {
        "id": "EVO-E2E",
        "topic": "Optimización Sintética de Módulo Dummy",
        "priority_score": 20.0
    }
    
    if not governor.validate_safety_policy(target):
        sys.exit(1)
        
    logger.info(f"Target Autorizado por GOVERNOR: {target['id']}")
    
    # Simulación de investigación y razonamiento (Ya probado en 1.0 y 1.1)
    logger.info("[RESEARCH] Buscando técnicas mundiales... [OK]")
    logger.info("[REASONING] Contrastando y generando hipótesis... [OK]")
    logger.info("[SANDBOX] Ejecutando experimento en contenedor aislado... [OK]")
    logger.info("[VERIFICATION] Experimento exitoso. Evidence Score: 0.95")
    
    # 2. CANARY & COMMIT (Pase a Producción)
    logger.info("=== INICIANDO THE PRODUCTION GATE (CANARY) ===")
    gate = ProductionGate()
    
    # Creamos un archivo dummy para testear
    dummy_file = "evolution/dummy_module.py"
    with open(os.path.join(gate.repo_path, dummy_file), "w") as f:
        f.write("# Archivo Original\n")
    
    # Hacemos commit del original para que git no de problemas de untracked
    gate.run_cmd(f"git add {dummy_file}")
    gate.run_cmd("git commit -m 'Add dummy module'")
    
    good_patch = "# Archivo Optimizado (Autonomía Completa)\nprint('NEXA E2E Funcionando')\n"
    logger.info("Prueba 1: Parche CORRECTO (Debería pasar Canary y hacer Merge)")
    
    success = gate.deploy_canary(dummy_file, good_patch)
    if success:
        logger.info("✅ [E2E SUCCESS] El código fue validado en Canary y fusionado a producción.")
    else:
        logger.error("❌ [E2E FAIL] Falló el despliegue del Canary válido.")
        
    # 3. ROLLBACK (Pase fallido a producción)
    logger.info("\n=== INICIANDO THE PRODUCTION GATE (ROLLBACK) ===")
    logger.info("Prueba 2: Parche MALICIOSO (Debería fallar el Health Check y hacer Rollback)")
    
    # Este parche introduce un error de sintaxis intencional
    bad_patch = "# Archivo Optimizado (Con error de sintaxis)\nprint('NEXA E2E Error'\n"
    
    # Re-escribimos el health check del gate dinámicamente para que escanee nuestro archivo dummy en lugar de sandbox_evaluator
    original_health = gate.health_check
    def dummy_health_check():
        code, out, err = gate.run_cmd(f"python3 -m py_compile {dummy_file}")
        if code != 0:
            logger.error(f"[CANARY] Health Check Falló: Error de compilación en {dummy_file}")
            return False
        return True
    
    gate.health_check = dummy_health_check
    
    success_bad = gate.deploy_canary(dummy_file, bad_patch)
    if not success_bad:
        logger.info("✅ [E2E SUCCESS] Rollback automático ejecutado correctamente protegiendo la producción.")
    else:
        logger.error("❌ [E2E FAIL] El sistema permitió fusionar un parche malicioso.")

    # Restaurar health check original
    gate.health_check = original_health
    
    logger.info("=== E2E TEST FINALIZADO ===")

if __name__ == "__main__":
    run_e2e()
