import os
import sys
from pathlib import Path

# Añadir ruta base al sys.path
BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))

    # Importa tu núcleo NEXA aquí
    from nexa_agente.protection_core import NEXACore

    app = NEXACore(
        port=port,
        enable_fenix_backup=True,  # Protocolo Fénix activo
        vault_path=os.getenv("ECHO_VAULT_PATH", "/data/nexa_echo_vault")
    )

    print(f"🟢 NEXA OS desplegado en puerto {port}")
    app.run(host="0.0.0.0", port=port)
