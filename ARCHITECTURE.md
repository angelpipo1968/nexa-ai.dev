# NEXA Architecture & Recovery Guide
**Version:** v3.0-stable-vercel-proxy
**Date:** 2026-08-11

## 1. Topología del Sistema

```text
                    ┌─────────────────────┐
                    │     NEXA Chat       │
                    │   nexa-ai.dev       │
                    └──────────┬──────────┘
                               │
                         /api/nexa
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Vercel / Next.js  │
                    │   API key privada   │
                    └──────────┬──────────┘
                               │
                         api.nexa-ai.dev
                               │
                        Cloudflare/Nginx
                               │
                               ▼
                    ┌─────────────────────┐
                    │     NEXA :8000      │
                    │      FastAPI        │
                    └─────────┬───────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
                 Ollama               vLLM
                    │                   │
                    └─────────┬─────────┘
                              ▼
                           RTX 3090
```

## 2. Componentes y Puertos
- **Frontend (Vercel)**: Serverless Next.js App. Expone `/` (chat) y `/landing`. Se comunica con el backend a través del proxy interno `/api/nexa`.
- **Nginx (Local)**: Proxy inverso en Ubuntu. Gestiona SSL vía Cloudflare y enruta tráfico de `api.nexa-ai.dev` hacia `:8000`.
- **NEXA Core (FastAPI)**: Puerto `8000`. Orquestador principal, Router de modelos e interfaz con LiteLLM/vLLM.
- **Ollama / vLLM**: Puertos internos `11434` / `4000` (Dockerizados). Motores de inferencia directa a la GPU.
- **Grafana**: Puerto `3000`. Telemetría de sistema.
- **Redis**: Caché y estado.

## 3. Seguridad
- **NEXA_API_KEY**: Almacenada exclusivamente en Vercel (Production Environment). **Nunca** en código cliente.
- **NEXA_API_URL**: Apunta a `https://api.nexa-ai.dev`.
- Ninguna IP privada (`192.168.x.x`) está expuesta en configuración pública.

## 4. Recuperación de Desastres (Disaster Recovery)

### Restaurar el código a este punto estable
Si el sistema o la rama `main` se corrompe por futuros desarrollos, puedes volver a este punto exacto (v3.0):
```bash
git checkout v3.0-stable-vercel-proxy
# o, para forzar que main vuelva a este commit:
git reset --hard v3.0-stable-vercel-proxy
git push origin main --force
```

### Restaurar desde el backup físico
En el directorio se encuentra `nexa-core-stable-2026-08-11.tar.gz`. Contiene todo el código sin carpetas pesadas (`node_modules`, `venv`, `.git`).
```bash
tar -xzf nexa-core-stable-2026-08-11.tar.gz -C /ruta/de/recuperacion
```

### Reiniciar la infraestructura local (Docker/Nginx)
```bash
sudo systemctl restart nginx
# Reiniciar contenedores
docker-compose down
docker-compose up -d
```
