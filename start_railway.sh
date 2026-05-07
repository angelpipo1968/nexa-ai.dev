#!/bin/sh
set -e

echo "═══════════════════════════════════════════"
echo "🚀 Iniciando NEXA OS v6.0-SINGULARITY"
echo "═══════════════════════════════════════════"

# ── 1. Variables de entorno ──
export PYTHONUNBUFFERED=1
export PORT=${PORT:-7860}

# ── 2. Verificar estructura de directorios ──
echo "📁 Verificando estructura..."
mkdir -p /data/nexa_echo_vault /tmp/gnupg
chmod -R 700 /tmp/gnupg 2>/dev/null || true

# ── 3. Verificar que el frontend está construido ──
if [ -d "dist" ]; then
    echo "✅ Frontend encontrado en /app/dist"
    FILE_COUNT=$(find dist -type f | wc -l)
    echo "   Archivos: ${FILE_COUNT}"
else
    echo "⚠️ Frontend no encontrado. Solo API disponible."
fi

# ── 4. Health check rápido de dependencias ──
echo "🔍 Verificando dependencias Python..."
python -c "import fastapi, uvicorn, httpx; print('✅ Dependencias OK')" || {
    echo "❌ Dependencias faltantes. Instalando..."
    pip install -r requirements.txt
}

# ── 5. Iniciar Ollama si está instalado (opcional) ──
if command -v ollama >/dev/null 2>&1; then
    echo "🧠 Iniciando Ollama en segundo plano..."
    ollama serve > /tmp/ollama.log 2>&1 &
    OLLAMA_PID=$!
    
    # Esperar a que esté listo (max 30s)
    for i in $(seq 1 30); do
        if curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
            echo "✅ Ollama listo (PID: $OLLAMA_PID)"
            
            # Descargar modelo si no existe
            if ! ollama list 2>/dev/null | grep -q "nexa-os"; then
                echo "📦 Descargando modelo qwen2.5:3b..."
                ollama pull qwen2.5:3b 2>/dev/null || echo "⚠️ No se pudo descargar el modelo."
            fi
            break
        fi
        sleep 1
    done
else
    echo "ℹ️  Ollama no instalado. Usando proveedores cloud."
fi

# ── 6. Iniciar NEXA OS ──
echo ""
echo "═══════════════════════════════════════════"
echo "🟢 NEXA OS desplegado en puerto ${PORT}"
echo "═══════════════════════════════════════════"

exec python main.py
