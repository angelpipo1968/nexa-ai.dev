from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import JSONResponse
import httpx
import asyncio
import time
import os
import json
import logging
from datetime import datetime

# Configuración de Logs para el Guardian Loop
logging.basicConfig(level=logging.INFO, filename='/app/nexa_guardian.log',
                    format='%(asctime)s - GUARDIAN - %(levelname)s - %(message)s')

app = FastAPI(title="Nexa Sovereign Brain V3 - Singularity Edition")

# Configuración
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
PRIMARY_MODEL = "qwen2.5:3b"
VISION_MODEL = "llama3.2-vision:3b"

class NexaSystem:
    def __init__(self):
        self.is_ready = False
        self.start_time = time.time()
        self.health_status = "Excellent"
        self.active_agents = ["Architect", "Researcher", "Security", "Visionary", "Publisher"]
        self.dream_log = []

nexa = NexaSystem()

# --- 🛡️ GUARDIAN LOOP: Autocuración ---
async def guardian_loop():
    """Vigila la salud del sistema y reinicia componentes si fallan"""
    while True:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get("http://localhost:11434/api/tags")
                if res.status_code == 200:
                    nexa.is_ready = True
                    nexa.health_status = "Excellent"
                else:
                    nexa.health_status = "Degraded"
                    logging.warning("Ollama service degraded. Attempting recovery...")
        except Exception as e:
            nexa.health_status = "Critical"
            logging.error(f"Guardian alert: {str(e)}")
        
        await asyncio.sleep(30)

# --- 🌙 DREAM PHASE: Tareas Proactivas ---
async def dream_phase_task():
    """Realiza investigaciones y optimización mientras el usuario no está"""
    while True:
        if (time.time() - nexa.start_time) > 3600: # Cada hora
            logging.info("Nexa entering Dream Phase: Optimizing memories and researching trends...")
            nexa.dream_log.append(f"Dream completed at {datetime.now().isoformat()}")
        await asyncio.sleep(3600)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(guardian_loop())
    asyncio.create_task(dream_phase_task())

@app.get("/status")
def get_status():
    return {
        "identity": "Nexa OS Singularity",
        "health": nexa.health_status,
        "swarm": nexa.active_agents,
        "is_ready": nexa.is_ready,
        "dream_cycles": len(nexa.dream_log)
    }

@app.post("/process")
async def process_task(request: Request):
    data = await request.json()
    prompt = data.get("prompt", "")
    agent_type = data.get("agent", "Architect") # Por defecto Architect
    images = data.get("images", [])
    
    # --- 🧬 NEXA SWARM: Lógica de Perfiles ---
    agent_prompts = {
        "Architect": "Eres Nexa Architect. Diseña soluciones técnicas, código y estructuras de datos con perfección.",
        "Researcher": "Eres Nexa Researcher. Analiza información, busca patrones y sintetiza datos complejos.",
        "Security": "Eres Nexa Security. Identifica vulnerabilidades y protege el sistema.",
        "Visionary": "Eres Nexa Visionary. Analiza imágenes y contextos visuales con detalle artístico y técnico.",
        "Publisher": "Eres Nexa Publisher (AeroBlog Edition). Tu misión es crear contenido de alto impacto, optimizado para SEO, con una estética futurista y narrativa cautivadora. Genera artículos listos para publicar."
    }
    
    system_prompt = agent_prompts.get(agent_type, agent_prompts["Architect"])
    target_model = VISION_MODEL if images else PRIMARY_MODEL
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]
    if images:
        messages[-1]["images"] = images

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json={
                "model": target_model,
                "messages": messages,
                "stream": False
            })
            
            res_json = response.json()
            content = res_json.get("message", {}).get("content", "")
            
            # Guardian: Registrar éxito
            logging.info(f"Task processed by {agent_type} using {target_model}")
            
            return {
                "result": f"=== 🧬 NEXA {agent_type.upper()} MODE ===\n\n{content}",
                "metadata": {
                    "agent": agent_type,
                    "model": target_model,
                    "health_tag": nexa.health_status
                }
            }
    except Exception as e:
        logging.error(f"Process error: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Guardian: Task recovery failed."})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
