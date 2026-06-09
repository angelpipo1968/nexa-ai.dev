## NEXA AI STUDIO v1 (Local Full System)

### Arquitectura General

```text
                 ┌────────────────────┐
                 │   NEXA UI (3000)   │
                 └─────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Agent Gateway 5002  │
                └───────┬─────────────┘
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
┌────────────┐   ┌────────────┐   ┌────────────┐
│ LLM (4001) │   │ IMAGE 5003 │   │ VIDEO 5004 │
└────────────┘   └────────────┘   └────────────┘
                                           ↓
                                    ┌────────────┐
                                    │ VOICE 5005 │
                                    └────────────┘
                                           ↓
                                      RTX 3090 GPU
```

### Módulos

- `LLM CORE (4001)`: LiteLLM / vLLM, Qwen / Llama / Mistral
- `IMAGE ENGINE (5003)`: ComfyUI, SDXL, Juggernaut, ControlNet opcional
- `VIDEO ENGINE (5004)`: AnimateDiff, Stable Video Diffusion
- `VOICE ENGINE (5005)`: Piper / Coqui TTS, Whisper local

### Flujo Real

Usuario:

```text
crea un video de un mar al atardecer y narralo con voz calmada
```

Interpretación:

```json
{
  "video": true,
  "voice": true,
  "prompt": "mar al atardecer"
}
```

Pipeline:

```text
LLM -> define escena
   ↓
VIDEO ENGINE -> genera clip
   ↓
VOICE ENGINE -> genera narración
   ↓
merge (ffmpeg)
   ↓
output final mp4
```

### Output Final

```text
video: /outputs/final/scene_001.mp4
audio: /outputs/audio/narration.wav
status: completed
```

### FFmpeg

```bash
ffmpeg -i video.mp4 -i audio.wav -c:v copy -c:a aac output.mp4
```

### Capacidad RTX 3090

- SDXL: sí
- AnimateDiff: sí, en clips cortos
- Whisper: sí
- TTS local: sí

### Qué Representa Este Sistema

- Runway ML local
- mini versión de Sora local
- Midjourney + video + voz
- agente multimedia autónomo

### Siguiente Nivel

- timeline editor
- escenas múltiples
- control de cámara IA
- memoria de personajes
- streaming en tiempo real
- multiusuario con colas GPU

### Archivos

- `README.md`
- `agent_gateway.py`
- `studio-flow.json`
- `roadmap.md`

