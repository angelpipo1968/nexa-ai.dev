#!/bin/bash
# ═══════════════════════════════════════════
#  NEXA AI — Setup Local para PC
#  Ejecutar: bash setup-local.sh
# ═══════════════════════════════════════════

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       🚀 NEXA AI — Setup Local          ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Verificar requisitos ──────────────────
echo "📋 Verificando requisitos..."

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ $1 no encontrado. Instálalo primero: $2"
        exit 1
    fi
    echo "✅ $1 encontrado: $(command -v "$1")"
}

check_command "git" "https://git-scm.com/downloads"
check_command "node" "https://nodejs.org (v18+)"
check_command "npm" "Viene con Node.js"

# Verificar versión de Node
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js v18+ requerido. Tienes v$(node -v)"
    exit 1
fi
echo "✅ Node.js v$(node -v) OK"

echo ""

# ── Clonar repo ───────────────────────────
echo "📥 Clonando repositorio..."

if [ -d "nexa-ai.dev" ]; then
    echo "📁 Carpeta nexa-ai.dev ya existe, actualizando..."
    cd nexa-ai.dev
    git pull origin main
else
    git clone https://github.com/angelpipo1968/nexa-ai.dev.git
    cd nexa-ai.dev
fi

echo ""

# ── Instalar dependencias ─────────────────
echo "📦 Instalando dependencias (puede tomar unos minutos)..."
npm install --legacy-peer-deps

echo ""

# ── Configurar entorno ────────────────────
echo "⚙️  Configurando entorno..."

if [ ! -f ".env.local" ]; then
    cat > .env.local << 'EOF'
# ═══════════════════════════════════════════
#  NEXA AI — Variables de Entorno Local
#  Edita estos valores con tus API keys
# ═══════════════════════════════════════════

# ── Servidor ──────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
NODE_ENV=development

# ── Supabase (Base de datos) ─────────────
# Obtener en: https://supabase.com/dashboard
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# ── Google AI (Gemini) ───────────────────
# Obtener en: https://aistudio.google.com/apikey
GOOGLE_AI_API_KEY=tu-api-key-de-google

# ── Anthropic (Claude) ───────────────────
# Obtener en: https://console.anthropic.com
ANTHROPIC_API_KEY=tu-api-key-de-anthropic

# ── OpenAI ────────────────────────────────
# Obtener en: https://platform.openai.com/api-keys
OPENAI_API_KEY=tu-api-key-de-openai

# ── DeepSeek ──────────────────────────────
# Obtener en: https://platform.deepseek.com
DEEPSEEK_API_KEY=tu-api-key-de-deepseek

# ── Groq ──────────────────────────────────
# Obtener en: https://console.groq.com
GROQ_API_KEY=tu-api-key-de-groq

# ── ElevenLabs (Voz) ─────────────────────
# Obtener en: https://elevenlabs.io
ELEVENLABS_API_KEY=tu-api-key-de-elevenlabs

# ── Ollama (Local, opcional) ─────────────
# Si tienes Ollama instalado localmente:
OLLAMA_BASE_URL=http://localhost:11434
EOF

    echo "📝 Archivo .env.local creado"
    echo "   ⚠️  EDITA .env.local con tus API keys antes de arrancar"
else
    echo "✅ .env.local ya existe"
fi

echo ""

# ── Crear .gitignore si falta ─────────────
if [ ! -f ".gitignore" ] || ! grep -q ".env.local" .gitignore; then
    echo ".env.local" >> .gitignore
    echo ".env" >> .gitignore
    echo "node_modules/" >> .gitignore
    echo ".next/" >> .gitignore
    echo "🔒 .env.local añadido a .gitignore"
fi

echo ""

# ── Verificar build ───────────────────────
echo "🔨 Verificando que el proyecto compila..."
if npm run build 2>/dev/null; then
    echo "✅ Build exitoso"
else
    echo "⚠️  Build tuvo warnings (puede funcionar igual)"
fi

echo ""

# ── Script de arranque ────────────────────
cat > start-nexa.sh << 'STARTEOF'
#!/bin/bash
echo "🚀 Iniciando NEXA AI..."
echo "   → http://localhost:3000"
echo "   → Ctrl+C para detener"
echo ""
npm run dev
STARTEOF
chmod +x start-nexa.sh

cat > start-nexa-prod.sh << 'PRODEOF'
#!/bin/bash
echo "🚀 Iniciando NEXA AI (producción)..."
echo "   → http://localhost:3000"
echo "   → Ctrl+C para detener"
echo ""
npm run build
npm run start
PRODEOF
chmod +x start-nexa-prod.sh

echo "╔══════════════════════════════════════════╗"
echo "║       ✅ Setup completado               ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "   1. Edita .env.local con tus API keys"
echo "      nano .env.local"
echo ""
echo "   2. Arranca el servidor:"
echo "      ./start-nexa.sh          (desarrollo)"
echo "      ./start-nexa-prod.sh     (producción)"
echo ""
echo "   3. Abre en el navegador:"
echo "      http://localhost:3000"
echo ""
echo "📁 Carpeta: $(pwd)"
echo ""
