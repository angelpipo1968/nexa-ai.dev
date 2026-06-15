# Nexa AI Agent - LangGraph on RTX 3090

Sistema de agente inteligente con LangGraph, ChromaDB y herramientas múltiples, corriendo en la RTX 3090.

## Inicio Rápido

```bash
cd nexa-agent
chmod +x install.sh
./install.sh
```

## Inicio Manual

```bash
cd nexa-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## Con PM2

```bash
pm2 start "venv/bin/python -m uvicorn api.main:app --host 0.0.0.0 --port 8000" \
     --name nexa-agent
```

## Endpoints

| Endpoint | Método | Descripción |
|---|---|---|
| `/health` | GET | Estado del sistema + GPU |
| `/docs` | GET | Documentación interactiva |
| `/chat` | POST | Chat estándar |
| `/chat/stream` | POST | Chat con streaming |
| `/deliberate` | POST | Razonamiento profundo |
| `/route` | POST | Enrutamiento inteligente |
| `/memory/add` | POST | Agregar conocimiento |
| `/memory/search` | GET | Buscar en memoria |
| `/memory/stats` | GET | Estadísticas de memoria |
| `/gpu/status` | GET | Estado detallado de GPU |
| `/generate/image` | POST | Generar imagen con SD XL |
| `/v1/chat/completions` | POST | Compatible con OpenAI API |
| `/v1/models` | GET | Lista de modelos |

## Herramientas del Agente

- 🔍 **Web Search** - Búsqueda en internet
- 💻 **Code Execution** - Ejecutar código Python
- 📁 **File Operations** - Leer/escribir archivos
- 🎮 **GPU Monitor** - Estado de la RTX 3090
- 🎨 **Image Generation** - Stable Diffusion XL
- 🔧 **Shell Commands** - Comandos del servidor (restringido)
- 📚 **Wikipedia** - Búsqueda enciclopédica
- 🧠 **Memory Recall** - Recordar conversaciones pasadas

## Configuración

Edita `.env` para personalizar:

```env
ENABLE_IMAGE_GEN=true      # Generación de imágenes
ENABLE_CODE_EXECUTION=true  # Ejecutar código
ENABLE_WEB_SEARCH=true     # Búsqueda web
ENABLE_SHELL=false         # Comandos shell (peligroso)
TEMPERATURE=0.7            # Creatividad (0.0-1.0)
MAX_TOKENS=4096            # Tokens máximos
```

## Arquitectura

```
Usuario → FastAPI (puerto 8000)
    → LangGraph StateGraph
        → Agente (razonamiento)
        → Herramientas (tools)
        → Memoria (ChromaDB)
    → RTX 3090 (modelo local)
    → LiteLLM (fallback)
    → Cloud SDK (último recurso)
```
