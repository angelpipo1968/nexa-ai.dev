## NEXA AI STUDIO v2 — Dashboard Real

### Qué Tendrás

Panel web en:

```text
http://localhost:3000/studio
```

Con:

- prompt único
- selector imagen / video / voz / todo
- estilos
- estado del sistema
- jobs en cola
- logs
- preview multimedia

### Arquitectura

```text
Usuario
   ↓
NEXA STUDIO UI
   ↓
/studio/run (5006)
   ↓
Studio Orchestrator
   ↓
Image + Video + Voice Engines
   ↓
RTX 3090 render
   ↓
output multimedia
```

### Resultado Esperado

```text
job_id: 1234-abc
image: /outputs/img.png
video: /outputs/video.mp4
voice: /outputs/audio.wav
status: completed
```

### Nivel Del Sistema

- Runway ML local mini
- flujo simplificado tipo Sora
- imagen + video + audio en un panel

### Archivos

- `studio_orchestrator.py`
- `studio-ui-example.tsx`
- `studio-flow.json`
- `README.md`

