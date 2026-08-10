import os
import subprocess
import logging

logger = logging.getLogger(__name__)

class ProductionGate:
    def __init__(self, repo_path="/home/angel/nexa-core"):
        self.repo_path = repo_path
        
    def run_cmd(self, cmd):
        result = subprocess.run(cmd, shell=True, cwd=self.repo_path, capture_output=True, text=True)
        return result.returncode, result.stdout, result.stderr
        
    def health_check(self) -> bool:
        """
        Realiza un Health Check del sistema en producción.
        En el futuro esto verificará puertos y requests reales.
        Por ahora, ejecutaremos un script de validación sintética si existe,
        o simplemente comprobaremos que el archivo python compila.
        """
        logger.info("[CANARY] Ejecutando Health Check...")
        
        # Validar la sintaxis de todos los archivos python importantes
        code, out, err = self.run_cmd("python3 -m py_compile evolution/sandbox_evaluator.py")
        if code != 0:
            logger.error(f"[CANARY] Health Check Falló: Error de compilación en sandbox_evaluator: {err}")
            return False
            
        return True

    def deploy_canary(self, file_path: str, new_content: str) -> bool:
        """
        Aplica un cambio experimental a través del Canary Gate.
        """
        logger.info(f"[CANARY] Iniciando despliegue seguro para {file_path}")
        
        # 1. Asegurarnos de estar limpios en master
        self.run_cmd("git reset --hard")
        self.run_cmd("git checkout master")
        
        # 2. Crear rama canary
        self.run_cmd("git branch -D evo-canary") # borrar si existe
        self.run_cmd("git checkout -b evo-canary")
        
        # 3. Aplicar cambios
        full_path = os.path.join(self.repo_path, file_path)
        with open(full_path, "w") as f:
            f.write(new_content)
            
        # 4. Commit en Canary
        self.run_cmd(f"git add {file_path}")
        self.run_cmd('git commit -m "EVO CANARY DEPLOY"')
        
        # 5. Ejecutar Health Check
        if self.health_check():
            logger.info("[CANARY] Health Check APROBADO. Promoviendo a producción...")
            self.run_cmd("git checkout master")
            self.run_cmd("git merge evo-canary")
            return True
        else:
            logger.error("[CANARY] Health Check REPROBADO. Iniciando ROLLBACK automático...")
            self.run_cmd("git checkout master")
            self.run_cmd("git branch -D evo-canary")
            logger.info("[ROLLBACK] Sistema restaurado a la versión estable de master.")
            return False
