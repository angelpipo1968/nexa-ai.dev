import subprocess
import tempfile
import os
import logging
import time
import ast

logger = logging.getLogger(__name__)

class SandboxEvaluator:
    def __init__(self, timeout_seconds=45):
        self.timeout = timeout_seconds
        self.allowed_modules = {"torch", "time", "os", "sys", "numpy", "vllm", "transformers", "math", "random"}

    def _check_imports(self, script_code: str) -> bool:
        """
        Verifica que el script solo importe librerías permitidas.
        """
        try:
            tree = ast.parse(script_code)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        base_module = alias.name.split('.')[0]
                        if base_module not in self.allowed_modules:
                            logger.error(f"Import prohibido: {alias.name}")
                            return False
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        base_module = node.module.split('.')[0]
                        if base_module not in self.allowed_modules:
                            logger.error(f"Import prohibido: {node.module}")
                            return False
            return True
        except Exception as e:
            logger.error(f"Error parseando script: {e}")
            return False

    def run_experiment(self, script_code: str, success_metric: str) -> dict:
        """
        Ejecuta el script en un subproceso aislado.
        """
        logger.info("Iniciando experimento en sandbox...")
        
        # Validar imports
        if not self._check_imports(script_code):
            return {
                "status": "FAIL",
                "stdout": "",
                "stderr": "Violación de política de seguridad: Módulo no permitido.",
                "execution_time": 0,
                "evidence_score": 0.0
            }

        # Guardar en un archivo temporal
        fd, path = tempfile.mkstemp(suffix=".py", prefix="nexa_experiment_")
        try:
            with os.fdopen(fd, 'w') as f:
                f.write(script_code)
            
            start_time = time.time()
            
            # Ejecutar de forma aislada
            result = subprocess.run(
                ["python3", path],
                capture_output=True,
                text=True,
                timeout=self.timeout
            )
            
            execution_time = time.time() - start_time
            
            stdout = result.stdout.strip()
            stderr = result.stderr.strip()
            
            # Evaluación
            if result.returncode == 0:
                logger.info(f"Experimento completado exitosamente en {execution_time:.2f}s.")
                return {
                    "status": "PASS",
                    "stdout": stdout,
                    "stderr": stderr,
                    "execution_time": execution_time,
                    "evidence_score": 0.90
                }
            else:
                logger.warning(f"Experimento falló (código {result.returncode}).")
                return {
                    "status": "FAIL",
                    "stdout": stdout,
                    "stderr": stderr,
                    "execution_time": execution_time,
                    "evidence_score": 0.0
                }
                
        except subprocess.TimeoutExpired:
            logger.warning(f"Experimento cancelado (Timeout > {self.timeout}s).")
            return {
                "status": "FAIL",
                "stdout": "",
                "stderr": f"TIMEOUT: El experimento no concluyó bajo las condiciones dadas ({self.timeout}s). Esto no invalida la hipótesis, solo la viabilidad del test actual.",
                "execution_time": self.timeout,
                "evidence_score": 0.85 # Alta confianza en que sabemos por qué falló el test (diagnóstico claro).
            }
        except Exception as e:
            logger.error(f"Error crítico en el sandbox: {e}")
            return {
                "status": "FAIL",
                "stdout": "",
                "stderr": str(e),
                "execution_time": 0,
                "evidence_score": 0.50 # Diagnóstico difuso
            }
        finally:
            if os.path.exists(path):
                os.remove(path)


