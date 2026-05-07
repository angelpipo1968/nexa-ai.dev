#!/bin/bash
echo "🚀 Preparando despliegue de NEXA en Railway..."

# Verificar GPG (opcional para firma de updates)
if ! gpg --list-keys "$GPG_KEY_ID" &>/dev/null; then
    echo "⚠️ GPG key no encontrada. Configura GPG_KEY_ID en Railway."
fi

# Validar sistema antes del deploy
if [ -f "scripts/pre_deploy_validator.py" ]; then
    echo "🔍 Ejecutando validación robusta Pre-Deploy..."
    if ! python scripts/pre_deploy_validator.py; then
        echo "❌ Validación fallida. Despliegue cancelado."
        exit 1
    fi
fi

# Generar reporte PDF si está disponible
if [ -f "scripts/generate_deployment_report.py" ]; then
    echo "📄 Generando reporte de despliegue..."
    python scripts/generate_deployment_report.py --format pdf --output deploy_report.pdf
fi

# Push a GitHub (Railway se conecta al repo)
git add .
git commit -m "chore: prep deploy Railway $(date +%Y%m%d-%H%M)"
git push origin main

echo "✅ Subido. Ve a Railway para triggerear el deploy."
