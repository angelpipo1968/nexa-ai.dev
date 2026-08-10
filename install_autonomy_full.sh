#!/bin/bash
set -e

echo "================================================================"
echo "🚀 NEXA AUTONOMOUS EVOLUTION ENGINE - INSTALLER"
echo "================================================================"

NEXA_DIR="/home/angel/nexa-core"
BACKUP_DIR="/home/angel/nexa-core-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "[1/6] Creando backup de seguridad..."
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/nexa-core-backup-$TIMESTAMP.tar.gz" -C /home/angel nexa-core
echo "✅ Backup guardado en: $BACKUP_DIR/nexa-core-backup-$TIMESTAMP.tar.gz"

echo "[2/6] Verificando dependencias (Docker, GPU, Python)..."
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado."
    exit 1
fi
if ! command -v nvidia-smi &> /dev/null; then
    echo "❌ Error: nvidia-smi no está instalado (GPU driver missing)."
    exit 1
fi
echo "✅ Dependencias base correctas."

echo "[3/6] Verificando estado del entorno NEXA..."
echo "--- Docker Containers ---"
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E "nexa-redis|nexa-vllm" || echo "⚠️  No todos los contenedores básicos están corriendo."

echo "--- Servicios ---"
systemctl is-active ollama >/dev/null && echo "✅ Ollama: ACTIVO" || echo "⚠️ Ollama: NO ACTIVO"

echo "[4/6] Configurando archivo de servicio systemd..."
if [ ! -f "/tmp/nexa-evolution.service" ]; then
    echo "❌ Error: No se encuentra /tmp/nexa-evolution.service."
    exit 1
fi

sudo cp /tmp/nexa-evolution.service /etc/systemd/system/nexa-evolution.service
sudo chmod 644 /etc/systemd/system/nexa-evolution.service

echo "[5/6] Habilitando y arrancando NEXA Evolution Daemon..."
sudo systemctl daemon-reload
sudo systemctl enable nexa-evolution.service
sudo systemctl restart nexa-evolution.service

echo "[6/6] Comprobando estado del servicio..."
sleep 3
if systemctl is-active --quiet nexa-evolution.service; then
    echo "✅ Servicio nexa-evolution arrancado exitosamente!"
    echo "================================================================"
    echo "🎉 INSTALACIÓN COMPLETADA"
    echo "El daemon está corriendo en segundo plano y evolucionará de manera autónoma."
    echo "Puedes ver los logs en vivo usando:"
    echo "   tail -f /home/angel/nexa-core/evolution.log"
    echo "O el status de systemd con:"
    echo "   sudo systemctl status nexa-evolution.service"
    echo "================================================================"
else
    echo "❌ Error: El servicio nexa-evolution falló al arrancar."
    echo "Revisa los logs con: sudo journalctl -u nexa-evolution.service -n 50"
    exit 1
fi
