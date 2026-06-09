## Sistema Local De Imagenes (RTX 3090)

### Objetivo

Montar un sistema local de generacion de imagenes para Nexa usando:

- Nexa UI
- Image API con FastAPI
- ComfyUI o servidor Stable Diffusion
- GPU RTX 3090

### Arquitectura

```text
Nexa UI (3000)
   ↓
Image API (5003 / FastAPI)
   ↓
ComfyUI o Stable Diffusion Server
   ↓
RTX 3090 (GPU)
```

### Opcion Recomendada

#### ComfyUI

- Mas rapido
- Modular
- Basado en nodos
- Muy bueno para produccion

### Instalacion En Linux / Ubuntu

#### Paso 1. Dependencias base

```bash
sudo apt update
sudo apt install git python3 python3-venv -y
```

#### Paso 2. Instalar ComfyUI

```bash
cd ~
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
```

#### Paso 3. Crear entorno Python

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
```

#### Paso 4. Instalar Torch para RTX 3090

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

#### Paso 5. Instalar dependencias de ComfyUI

```bash
pip install -r requirements.txt
```

#### Paso 6. Ejecutar ComfyUI

```bash
python main.py
```

UI:

```text
http://localhost:8188
```

### Modelos Recomendados

- SDXL base
- Juggernaut XL

Colocarlos en:

```text
ComfyUI/models/checkpoints/
```

### Integracion Con Nexa

En el gateway:

- `/chat` -> LLM
- `/image` -> Image API en puerto `5003`

### Flujo Final

```text
Usuario en Nexa
   ↓
"crea un mar al atardecer"
   ↓
Agent Gateway (5002)
   ↓
Image API (5003)
   ↓
ComfyUI
   ↓
RTX 3090 render
   ↓
imagen final
```

### Modo Pro

- Control de estilos: cinematic, anime, realistic
- Cola de imagenes para multiusuario
- Cache de prompts
- Generacion batch
- Video AI con AnimateDiff

### Realidad De La RTX 3090

- SDXL: perfecto
- 1024x1024: rapido
- Video AI: posible, pero mas pesado
- Modelos gigantes tipo Sora: no, normalmente cloud-only

### Siguiente Paso Posible

Se puede convertir esto en un sistema mas completo para Nexa:

- endpoint `/generate-image`
- panel en UI tipo ChatGPT
- selector de estilos
- cola de GPU
- logs en tiempo real

### Archivos De Esta Carpeta

- `README.md`: arquitectura e instalacion
- `image_api.py`: ejemplo inicial de API FastAPI para Nexa + ComfyUI
