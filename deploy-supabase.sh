#!/bin/bash
set -euo pipefail

if [ -z "${SUPABASE_PROJECT_ID:-}" ]; then
  echo "❌ SUPABASE_PROJECT_ID is required. Set it as an environment variable or GitHub secret."
  exit 1
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN is required. Set it as an environment variable or GitHub secret."
  exit 1
fi

echo "🚀 Desplegando Nexa AI con Supabase"

echo "1/5 - Instalando dependencias necesarias..."
npm install

if [ -f .env.example ] && [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "⚠️ .env.local creado desde .env.example. Actualiza las credenciales de Supabase antes de continuar."
fi

echo "2/5 - Autenticando Supabase CLI..."
npx supabase login --access-token "$SUPABASE_ACCESS_TOKEN"

echo "3/5 - Enlazando proyecto Supabase..."
npx supabase link --project-ref "$SUPABASE_PROJECT_ID"

echo "4/5 - Aplicando esquema y migraciones..."
if [ -d supabase ]; then
  npx supabase db push --yes
else
  echo "⚠️ No se encontró carpeta supabase/. Verifica tu proyecto.
";
fi

echo "5/5 - Validando despliegue"
# Si necesitas agregar seeds o políticas, complétalos en supabase/"

echo "✅ Supabase deployment workflow completed."

echo "Asegúrate de tener configurado el dominio en Vercel y las variables de entorno en Supabase."