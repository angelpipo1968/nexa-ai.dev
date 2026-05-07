#!/bin/sh
set -e

echo "🚀 Starting Nexa Sovereign Brain V3 Infrastructure..."

# 1. Iniciar Ollama en segundo plano
ollama serve > /app/ollama.log 2>&1 &
OLLAMA_PID=$!

# 2. Esperar a que Ollama esté listo para recibir modelos
echo "⏳ Waiting for Ollama to initialize..."
sleep 10

# 3. Pull de los modelos necesarios (Esto se hace solo la primera vez o si faltan)
echo "📦 Pulling Nexa Optimized Models..."
ollama pull qwen2.5:3b || echo "⚠️ Failed to pull qwen2.5"
ollama pull llama3.2-vision:3b || echo "⚠️ Failed to pull llama3.2-vision"

echo "✅ Models loaded. Starting Brain API..."

# 4. Iniciar la API de FastAPI en primer plano
# Usamos uvicorn directamente
exec python app.py
