@echo off
REM ═══════════════════════════════════════════
REM  NEXA AI — Setup Local para Windows
REM  Ejecutar: doble click en setup-local.bat
REM ═══════════════════════════════════════════

echo.
echo ╔══════════════════════════════════════════╗
echo ║       🚀 NEXA AI — Setup Local          ║
echo ╚══════════════════════════════════════════╝
echo.

REM ── Verificar requisitos ──────────────────
echo 📋 Verificando requisitos...

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git no encontrado. Descarga en: https://git-scm.com/downloads
    pause
    exit /b 1
)
echo ✅ Git encontrado

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js no encontrado. Descarga en: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js encontrado

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm no encontrado. Reinstala Node.js
    pause
    exit /b 1
)
echo ✅ npm encontrado

echo.

REM ── Clonar repo ───────────────────────────
echo 📥 Clonando repositorio...

if exist "nexa-ai.dev" (
    echo 📁 Carpeta nexa-ai.dev ya existe, actualizando...
    cd nexa-ai.dev
    git pull origin main
) else (
    git clone https://github.com/angelpipo1968/nexa-ai.dev.git
    cd nexa-ai.dev
)

echo.

REM ── Instalar dependencias ─────────────────
echo 📦 Instalando dependencias (puede tomar unos minutos)...
call npm install --legacy-peer-deps

echo.

REM ── Configurar entorno ────────────────────
echo ⚙️  Configurando entorno...

if not exist ".env.local" (
    (
        echo # ═══════════════════════════════════════════
        echo #  NEXA AI — Variables de Entorno Local
        echo #  Edita estos valores con tus API keys
        echo # ═══════════════════════════════════════════
        echo.
        echo # Servidor
        echo NEXT_PUBLIC_APP_URL=http://localhost:3000
        echo PORT=3000
        echo NODE_ENV=development
        echo.
        echo # Supabase - https://supabase.com/dashboard
        echo NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
        echo NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
        echo.
        echo # Google AI - https://aistudio.google.com/apikey
        echo GOOGLE_AI_API_KEY=tu-api-key-de-google
        echo.
        echo # Anthropic - https://console.anthropic.com
        echo ANTHROPIC_API_KEY=tu-api-key-de-anthropic
        echo.
        echo # OpenAI - https://platform.openai.com/api-keys
        echo OPENAI_API_KEY=tu-api-key-de-openai
        echo.
        echo # DeepSeek - https://platform.deepseek.com
        echo DEEPSEEK_API_KEY=tu-api-key-de-deepseek
        echo.
        echo # Groq - https://console.groq.com
        echo GROQ_API_KEY=tu-api-key-de-groq
        echo.
        echo # ElevenLabs - https://elevenlabs.io
        echo ELEVENLABS_API_KEY=tu-api-key-de-elevenlabs
        echo.
        echo # Ollama (local, opcional)
        echo OLLAMA_BASE_URL=http://localhost:11434
    ) > .env.local
    echo 📝 Archivo .env.local creado
    echo    ⚠️  EDITA .env.local con tus API keys antes de arrancar
) else (
    echo ✅ .env.local ya existe
)

echo.

REM ── Crear scripts de arranque ─────────────
(
    echo @echo off
    echo echo 🚀 Iniciando NEXA AI...
    echo echo    → http://localhost:3000
    echo echo    → Ctrl+C para detener
    echo echo.
    echo call npm run dev
) > start-nexa.bat

(
    echo @echo off
    echo echo 🚀 Iniciando NEXA AI ^(producción^)...
    echo echo    → http://localhost:3000
    echo echo    → Ctrl+C para detener
    echo echo.
    echo call npm run build
    echo call npm run start
) > start-nexa-prod.bat

echo ╔══════════════════════════════════════════╗
echo ║       ✅ Setup completado               ║
echo ╚══════════════════════════════════════════╝
echo.
echo 📋 Próximos pasos:
echo.
echo    1. Edita .env.local con tus API keys
echo       notepad .env.local
echo.
echo    2. Arranca el servidor:
echo       Doble click en start-nexa.bat
echo.
echo    3. Abre en el navegador:
echo       http://localhost:3000
echo.
echo 📁 Carpeta: %cd%
echo.
pause
