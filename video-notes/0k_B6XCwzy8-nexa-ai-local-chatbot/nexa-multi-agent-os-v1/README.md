## NEXA MULTI-AGENT OS v1

### Qué Es

No es solo una IA suelta. Es un sistema tipo estudio autónomo donde:

- un agente no hace todo
- cada agente tiene un rol
- trabajan en cadena
- generan contenido completo

### Arquitectura

```text
                ┌──────────────────────┐
                │     NEXA UI (3000)   │
                └─────────┬────────────┘
                          ↓
                ┌──────────────────────┐
                │ Orchestrator (5007)  │
                └─────────┬────────────┘
        ┌──────────┬──────────┬──────────┬──────────┐
        ↓          ↓          ↓          ↓
  Director    Writer     Camera     Editor
   Agent      Agent      Agent      Agent
   (A1)       (A2)       (A3)       (A4)
        ↓          ↓          ↓          ↓
                Execution Layer
                      ↓
              GPU (RTX 3090)
```

### Roles

- `Director`: decide escena, estilo, duración y estructura
- `Writer`: genera narrativa, diálogo, escenas y prompts
- `Camera`: define ángulos, movimiento, zoom e iluminación
- `Editor`: une video, audio, cortes y render final

### Ejemplo Real

Usuario:

```text
crea una escena de un océano futurista con narración épica
```

Flujo:

- Director:

```json
{
  "theme": "océano futurista",
  "style": "cinematic sci-fi",
  "duration": 6
}
```

- Writer:

```json
{
  "scene": "noche en océano digital",
  "narration": "El mar del futuro despierta..."
}
```

- Camera:

```json
{
  "angles": ["drone", "underwater", "wide shot"],
  "motion": "slow cinematic movement"
}
```

- Editor:

```json
{
  "video": "/final/output.mp4",
  "audio": "/final/narration.wav"
}
```

### Nivel Siguiente

- memoria persistente
- continuidad entre escenas
- series automáticas
- agentes discutiendo entre sí
- auto-mejora

### Archivos

- `README.md`
- `orchestrator.py`
- `multi-agent-flow.json`

