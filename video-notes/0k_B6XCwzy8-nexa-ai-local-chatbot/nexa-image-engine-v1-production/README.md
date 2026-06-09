## NEXA IMAGE ENGINE v1 (Production)

### Arquitectura Final

```text
[Nexa UI (3000)]
      ↓
[Agent Gateway (5002)]
      ↓
[Image Service API (5003 - FastAPI)]
      ↓
[ComfyUI Server (8188)]
      ↓
[RTX 3090 GPU]
```

### Core Del Sistema

- `Nexa UI`: interfaz del usuario
- `Agent Gateway`: decide si la petición va al LLM o al motor de imágenes
- `Image Service API`: expone `/generate` y habla con ComfyUI
- `ComfyUI`: ejecuta el workflow visual
- `RTX 3090`: renderiza la imagen

### Ejecución Del Servicio

```bash
uvicorn image_service:app --host 0.0.0.0 --port 5003
```

### ComfyUI

Debe estar corriendo en:

```text
http://localhost:8188
```

### Flujo UI

Usuario:

```text
crea un mar al atardecer con estilo cinematografico
```

Detección lógica:

```json
{
  "type": "image",
  "prompt": "mar al atardecer",
  "style": "cinematic"
}
```

### Respuesta En UI

```text
Imagen en proceso...
estilo: cinematic
GPU: RTX 3090
estado: queued
```

### Mejoras Pro Recomendadas

- Cola FIFO o Redis
- Almacenamiento en `/outputs/images/`
- Endpoint `/status/{id}`
- Endpoint `/result/{id}`

### Evolución Futura

- ControlNet
- LoRA styles
- Face consistency
- Batch generation
- Video AI
- Streaming preview

### Archivos En Esta Carpeta

- `README.md`: visión general
- `image_service.py`: servicio FastAPI principal
- `gateway_integration.py`: ejemplo de integración con el gateway
- `ui-flow.json`: flujo lógico de frontend
- `roadmap.md`: mejoras siguientes

