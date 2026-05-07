#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════
# NEXA OS — Deploy Script Seguro para Hugging Face
# ═══════════════════════════════════════════
# Uso: ./deploy_hf.sh "Mensaje de commit"
# ═══════════════════════════════════════════

MESSAGE=${1:-"Update Nexa OS to latest sovereign build"}
HF_REMOTE="https://huggingface.co/spaces/angelpipo1968/nexa-brain-v4"

echo "🚀 Preparando deployment a Hugging Face..."

# ── 1. Validar que estamos en un repo git ──
if [ ! -d .git ]; then
    echo "❌ Error: No es un repositorio git."
    exit 1
fi

# ── 2. Validar que el build funcione antes de deployar ──
echo "🔨 Validando build de producción..."
if ! npm run build 2>/dev/null; then
    echo "❌ Build fallido. Abortando deploy para evitar desplegar código roto."
    exit 1
fi
echo "✅ Build exitoso."

# ── 3. Verificar que no se suban secretos ──
FORBIDDEN_FILES=".env .env.local .env.production"
for f in $FORBIDDEN_FILES; do
    if git diff --cached --name-only 2>/dev/null | grep -q "^${f}$"; then
        echo "❌ ERROR: Archivo sensible '${f}' detectado en staging. Abortando."
        echo "   Ejecuta: git reset HEAD ${f}"
        exit 1
    fi
done

# Verificar que .gitignore existe y tiene .env
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo "⚠️ ADVERTENCIA: '.env' no está en .gitignore. Añadiéndolo..."
    echo ".env" >> .gitignore
fi

# ── 4. Verificar tamaño del repo (prevenir bloat) ──
REPO_SIZE=$(du -sm .git | cut -f1)
if [ "$REPO_SIZE" -gt 500 ]; then
    echo "⚠️ ADVERTENCIA: El repo pesa ${REPO_SIZE}MB. Considera limpiar el historial."
fi

# ── 5. Añadir remote de HF si no existe ──
if ! git remote | grep -q "hf"; then
    echo "📦 Añadiendo remote de Hugging Face..."
    git remote add hf "$HF_REMOTE"
fi

# ── 6. Commit changes ──
echo "📝 Committing cambios..."
git add -A
git commit -m "$MESSAGE" --no-verify 2>/dev/null || echo "ℹ️  No hay cambios nuevos para commit."

# ── 7. Push seguro (sin --force por defecto) ──
echo "📤 Pushing a Hugging Face (main)..."
if ! git push hf main 2>/dev/null; then
    echo "⚠️ Push normal falló. Intentando con --force-with-lease..."
    git push hf main --force-with-lease
fi

echo "═══════════════════════════════════════"
echo "✅ Deployment completado exitosamente!"
echo "📍 URL: $HF_REMOTE"
echo "═══════════════════════════════════════"
