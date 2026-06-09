## NEXA VIDEO AI ENGINE v1 (Local RTX 3090)

### Arquitectura

```text
[Nexa UI (3000)]
      ↓
[Gateway (5002)]
      ↓
[Video API (5004 - FastAPI)]
      ↓
[ComfyUI + AnimateDiff]
      ↓
[RTX 3090 GPU]
      ↓
MP4 output
```

### Core

- `Nexa UI`: interfaz de usuario
- `Gateway`: decide si la petición es de video, imagen o LLM
- `Video API`: endpoint `/generate-video`
- `ComfyUI + AnimateDiff`: backend real de video
- `RTX 3090`: render

### Ejecución

```bash
uvicorn video_service:app --host 0.0.0.0 --port 5004
```

### Motor Real Recomendado

En ComfyUI:

- AnimateDiff
- Stable Video Diffusion (SVD)

### Router Inteligente

```text
if "video" in intent:
    call Video Engine
elif "image" in intent:
    call Image Engine
else:
    call LLM
```

### Ejemplo De Uso

Usuario:

```text
crea un video de un mar con olas al atardecer estilo cinematografico
```

Detección:

```json
{
  "type": "video",
  "prompt": "mar con olas al atardecer",
  "style": "cinematic",
  "duration": 4
}
```

### Salida Esperada

```text
status: queued
file: /outputs/videos/clip_001.mp4
fps: 12
duration: 4s
```

### Realidad De La RTX 3090

- Stable Diffusion: excelente
- AnimateDiff: bueno si está optimizado
- Videos largos: pesado
- Tipo Sora/OpenAI: no local todavía

### Nivel Siguiente

- video + audio sync
- lip sync
- control de cámara
- storyboard AI
- generación por escenas
- streaming preview

### Archivos

- `README.md`
- `video_service.py`
- `gateway_video_integration.py`
- `ui-flow.json`

