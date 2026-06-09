## NEXA AI STUDIO v3 — Agentic System (AI Director)

### Idea Central

Antes:

```text
usuario -> prompt -> imagen/video
```

Ahora:

```text
usuario -> intención -> agente director -> plan -> ejecución por módulos -> resultado final
```

### Arquitectura

```text
                ┌──────────────────────┐
                │   NEXA UI (3000)     │
                └─────────┬────────────┘
                          ↓
              ┌──────────────────────┐
              │ Agent Director 5007  │
              └───────┬──────────────┘
          ┌───────────┼───────────────┐
          ↓           ↓               ↓
   Image Agent   Video Agent     Voice Agent
   (5003)        (5004)          (5005)
          ↓           ↓               ↓
                RTX 3090 GPU
```

### Qué Hace

- usa LLM para planificar
- decide si crear imagen, video, voz o todo
- ejecuta cada módulo
- devuelve un resultado compuesto

### Ejemplo

Usuario:

```text
crea una escena de un océano al atardecer con narración calmada
```

Plan:

```json
{
  "image": true,
  "video": true,
  "voice": true,
  "scene_description": "océano al atardecer cinematográfico con narrativa calmada"
}
```

### Resultado

```text
job_id: xyz
image: ok
video: ok
voice: ok
status: completed
```

### Nivel Siguiente

- memoria de personajes
- continuidad de escenas
- storytelling largo
- cámara controlada por IA
- múltiples agentes
- planificación cinematográfica

### Archivos

- `README.md`
- `agent_director.py`
- `agent-flow.json`

