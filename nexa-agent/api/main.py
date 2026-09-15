from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
import time
import json
import asyncio
import uuid
import os
import urllib.request
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

from vram_controller import VRAMController
from queue_manager import QueueManager
from comfyui_client import build_client_from_env
from intent_classifier import classify_intent
from nexa_agent import NexaAgent

import logging.handlers

log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
handlers = [logging.StreamHandler()]
if os.path.exists("/logs"):
    handlers.append(logging.handlers.RotatingFileHandler("/logs/router.log", maxBytes=10*1024*1024, backupCount=3))

logging.basicConfig(level=logging.INFO, format=log_format, handlers=handlers)
logger = logging.getLogger(__name__)

app = FastAPI(title="NEXA-3.0 Router", version="3.0.0")

# Promethues Metrics
REQUEST_COUNT = Counter(
    "nexa_router_http_requests_total",
    "Total HTTP requests in NEXA Router",
    ["method", "endpoint", "status"]
)
REQUEST_LATENCY = Histogram(
    "nexa_router_http_request_duration_seconds",
    "HTTP Request duration in seconds",
    ["method", "endpoint"]
)
VRAM_USAGE_GAUGE = Gauge(
    "nexa_router_vram_used_gb",
    "VRAM used in GB reported by VRAM Controller"
)

@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    endpoint = request.url.path
    REQUEST_COUNT.labels(method=request.method, endpoint=endpoint, status=response.status_code).inc()
    REQUEST_LATENCY.labels(method=request.method, endpoint=endpoint).observe(duration)
    try:
        status_info = vram_controller.get_status()
        if isinstance(status_info, dict) and "used_vram_gb" in status_info:
            VRAM_USAGE_GAUGE.set(float(status_info["used_vram_gb"]))
    except Exception:
        pass
    return response

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Inicializar VRAM Controller y Queue Manager
vram_controller = VRAMController(max_vram_gb=22)
queue_manager = QueueManager()
comfyui_client = build_client_from_env()  # F1: None si no configurado
nexa_agent = NexaAgent()

# Modelos de Solicitud
class ModelLoadRequest(BaseModel):
    model_name: str

class ChatRequest(BaseModel):
    model: Optional[str] = "deepseek-v3-lite"
    messages: list
    max_tokens: Optional[int] = 200
    temperature: Optional[float] = 0.7
    stream: Optional[bool] = False
    lang: Optional[str] = "es"

# ===== ENDPOINTS =====

@app.get("/")
async def root():
    return {"status": "ok", "service": "NEXA-3.0 Router"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "vram": vram_controller.get_status()
    }

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/v1/status")
async def get_status():
    """Estado del router y VRAM"""
    return vram_controller.get_status()

@app.post("/v1/models/load")
async def load_model(request: ModelLoadRequest):
    """Carga un modelo en VRAM u Ollama Adapter"""
    result = vram_controller.load_model(request.model_name)
    if result is None:
        err = vram_controller.last_error or f"No se pudo cargar {request.model_name}"
        raise HTTPException(status_code=400, detail=err)
    return {"status": "loaded", "model": request.model_name}

@app.post("/v1/models/unload")
async def unload_model(request: ModelLoadRequest):
    """Descarga un modelo de VRAM"""
    success = vram_controller.unload_model(request.model_name)
    return {"status": "unloaded" if success else "not_found", "model": request.model_name}

@app.post("/v1/models/unload_all")
async def unload_all():
    """Descarga todos los modelos"""
    vram_controller.unload_all()
    return {"status": "all_unloaded"}

@app.post("/agent")
async def agent_chat(request: ChatRequest):
    """Endpoint aislado para interactuar con NexaAgent de forma segura."""
    request_id = str(uuid.uuid4())
    logger.info(f"Agent request {request_id}: model={request.model}")
    
    messages_dicts = []
    for m in request.messages:
        messages_dicts.append(m.model_dump() if hasattr(m, "model_dump") else (m.dict() if hasattr(m, "dict") else m))

    try:
        final_response = await nexa_agent.run(messages_dicts, model=request.model)
        return {
            "id": f"chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model or nexa_agent.default_model,
            "choices": [{
                "index": 0,
                "message": final_response,
                "finish_reason": "stop"
            }]
        }
    except Exception as e:
        logger.error(f"Error en /api/agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    """Endpoint principal de chat compatible con la APK Android (/chat) y la especificación de OpenAI (/v1/chat/completions)"""
    request_id = str(uuid.uuid4())
    # 1. Detectar si la petición contiene imágenes (multimodal)
    has_images = False
    if request.messages:
        last_m = request.messages[-1]
        m_dict = last_m.model_dump() if hasattr(last_m, "model_dump") else (last_m.dict() if hasattr(last_m, "dict") else last_m)
        if isinstance(m_dict, dict) and bool(m_dict.get("images")):
            has_images = True

    # 2. Clasificar la intención del usuario
    req_lang = request.lang or "es"
    intent = classify_intent(request.messages, has_images, req_lang)
    logger.info(f"Chat request {request_id}: Intent='{intent}', has_images={has_images}, lang='{req_lang}'")

    # --- ACTIVE ORCHESTRATOR ---
    if intent == "agent":
        logger.info(f"Orquestador redirigiendo a AGENT para {request_id}")
        start_time = time.time()
        try:
            agent_model = request.model or nexa_agent.default_model
            final_response = await nexa_agent.run(request.messages, model=agent_model)
            duration = time.time() - start_time
            logger.info(f"Agent Completado ({duration:.2f}s) para {request_id}")
            
            if request.stream:
                async def agent_streamer():
                    content = final_response.get("content", "")
                    sse_payload = json.dumps({"content": content})
                    yield f"data: {sse_payload}\n\n"
                    yield "data: [DONE]\n\n"
                return StreamingResponse(agent_streamer(), media_type="text/event-stream")
            else:
                return {
                    "id": f"chatcmpl-{int(time.time())}",
                    "object": "chat.completion",
                    "created": int(time.time()),
                    "model": agent_model,
                    "choices": [{"index": 0, "message": final_response, "finish_reason": "stop"}]
                }
        except Exception as agent_e:
            logger.error(f"Fallo en Agente para {request_id}: {agent_e}. Fallback a CHAT NORMAL.")
            # Fallback seguro: dejamos que continúe hacia el flujo normal de chat
    elif intent in ["text2image", "image_edit"]:
        logger.info(f"Orquestador redirigiendo a GENERATION/EDIT para {request_id}")
    elif intent == "caption":
        logger.info(f"Orquestador redirigiendo a MULTIMODAL para {request_id}")
    else:
        logger.info(f"Orquestador redirigiendo a CHAT NORMAL para {request_id}")
    # --------------------------------

    # 3. Enrutamiento directo a FLUX si la intención es text2image (F2.3)
    if intent == "text2image":
        last_user_msg = ""
        for m in reversed(request.messages):
            m_dict = m.model_dump() if hasattr(m, "model_dump") else (m.dict() if hasattr(m, "dict") else m)
            if isinstance(m_dict, dict) and m_dict.get("role") == "user":
                content = m_dict.get("content", "")
                if isinstance(content, list):
                    text_parts = [item.get("text", "") for item in content if isinstance(item, dict) and item.get("type") == "text"]
                    last_user_msg = " ".join(text_parts)
                elif isinstance(content, str):
                    last_user_msg = content
                break
        
        if not last_user_msg:
            last_user_msg = "Genera una imagen artística"
            
        gen_request = GenerateImageRequest(prompt=last_user_msg)
        try:
            img_response = await generate_image(gen_request)
            import base64
            b64_img = base64.b64encode(img_response.body).decode("utf-8")
            image_uri = f"data:image/png;base64,{b64_img}"
            
            if request.stream:
                async def img_streamer():
                    sse_payload = json.dumps({"type": "image", "image_url": image_uri})
                    yield f"data: {sse_payload}\n\n"
                    yield "data: [DONE]\n\n"
                return StreamingResponse(img_streamer(), media_type="text/event-stream")
            else:
                return {
                    "id": f"chatcmpl-{int(time.time())}",
                    "object": "chat.completion",
                    "created": int(time.time()),
                    "model": "flux",
                    "choices": [{"index": 0, "message": {"role": "assistant", "content": "", "image_url": image_uri}, "finish_reason": "stop"}]
                }
        except Exception as e:
            logger.error(f"Error generando imagen text2image: {e}")
            if request.stream:
                async def err_streamer():
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                    yield "data: [DONE]\n\n"
                return StreamingResponse(err_streamer(), media_type="text/event-stream")
            else:
                raise HTTPException(status_code=500, detail=str(e))

    # 4. Inyección del idioma (F2.1)
    LANG_SYSTEM_PROMPTS = {
        "es": "Eres NEXA, un asistente de IA creativo. Responde siempre en español, sin excepción.",
        "en": "You are NEXA, a creative AI assistant. Always respond in English.",
        "fr": "Tu es NEXA, un assistant IA créatif. Réponds toujours en français.",
        "de": "Du bist NEXA, ein kreativer KI-Assistent. Antworte immer auf Deutsch.",
        "pt": "Você é NEXA, um assistente de IA criativo. Responda sempre em português.",
    }
    lang_prefix = req_lang.split("-")[0].lower() if req_lang else "es"
    sys_prompt = LANG_SYSTEM_PROMPTS.get(lang_prefix, LANG_SYSTEM_PROMPTS["es"])
    
    messages_dicts = []
    has_system = False
    for m in request.messages:
        m_dict = m.model_dump() if hasattr(m, "model_dump") else (m.dict() if hasattr(m, "dict") else m)
        if isinstance(m_dict, dict):
            if m_dict.get("role") == "system":
                has_system = True
                m_dict["content"] = sys_prompt + "\n\n" + str(m_dict.get("content", ""))
            messages_dicts.append(m_dict)
        else:
            messages_dicts.append(m)
            
    if not has_system:
        messages_dicts.insert(0, {"role": "system", "content": sys_prompt})
        
    request.messages = messages_dicts

    installed_models = []
    try:
        req_tags = urllib.request.Request("http://172.18.0.1:11434/api/tags")
        with urllib.request.urlopen(req_tags, timeout=2) as resp_tags:
            tags_json = json.loads(resp_tags.read().decode("utf-8"))
            installed_models = [m.get("name", "").split(":")[0] for m in tags_json.get("models", [])]
    except Exception as tag_err:
        logger.warning(f"No se pudo consultar tags de Ollama: {tag_err}")

    # 5. Enrutamiento de modelos LLM / VLM basado en intención
    if intent == "caption" and any(v in installed_models for v in ["moondream", "llava", "qwen2-vl", "llama3.2-vision"]):
        target_model_name = next(v for v in ["moondream", "llava", "qwen2-vl", "llama3.2-vision"] if v in installed_models)
        logger.info(f"Chat request {request_id}: INTENT CAPTION -> Enrutando a modelo de visión activo '{target_model_name}'")
    elif intent == "image_edit":
        target_model_name = request.model or "deepseek-v3-lite"
        logger.info(f"Chat request {request_id}: INTENT IMAGE_EDIT -> F2.4 img2img not ready, fallback to '{target_model_name}'")
    else:
        target_model_name = request.model or "deepseek-v3-lite"
        if has_images and intent != "image_edit":
            logger.info(f"Chat request {request_id}: Imagen recibida pero sin modelo de visión o intent fallback. Usando '{target_model_name}'")
        else:
            logger.info(f"Chat request {request_id}: model={target_model_name}, stream={request.stream}")
    
    # 1. Encolar y esperar turno
    payload = request.model_dump() if hasattr(request, 'model_dump') else request.dict()
    await queue_manager.request_turn(request_id, payload)
    
    released_by_stream = False
    try:
        # 2. Cargar modelo si no está en VRAM / Registry
        if target_model_name not in vram_controller.loaded_models:
            logger.info(f"Modelo {target_model_name} no cargado. Cargando...")
            result = vram_controller.load_model(target_model_name)
            if result is None:
                err = vram_controller.last_error or f"Modelo {target_model_name} no disponible"
                raise HTTPException(status_code=503, detail=err)
        
        # 3. Recuperar el modelo/adaptador cargado
        model_ref = vram_controller.loaded_models[target_model_name]
        
        # 4. Delegación a Ollama si el backend es "ollama"
        if isinstance(model_ref, tuple) and model_ref[0] == "ollama":
            _, host_port, target_model = model_ref
            ollama_url = f"http://{host_port}/api/chat"
            
            clean_messages = []
            for m in request.messages:
                m_dict = m.model_dump() if hasattr(m, "model_dump") else (m.dict() if hasattr(m, "dict") else m)
                if isinstance(m_dict, dict):
                    role = m_dict.get("role", "user")
                    content = m_dict.get("content", "")
                    if isinstance(content, list):
                        text_parts = [item.get("text", "") for item in content if isinstance(item, dict) and item.get("type") == "text"]
                        content = " ".join(text_parts) if text_parts else "¿Qué ves en esta imagen?"
                    clean_msg = {"role": role, "content": str(content)}
                    images = m_dict.get("images", [])
                    if images and ("vision" in target_model.lower() or "moondream" in target_model.lower() or "llava" in target_model.lower()):
                        clean_images = []
                        for img in images:
                            if isinstance(img, str):
                                clean_images.append(img.split("base64,")[-1].strip())
                        if clean_images:
                            clean_msg["images"] = clean_images
                    clean_messages.append(clean_msg)
                else:
                    clean_messages.append(m)

            ollama_payload = {
                "model": target_model,
                "messages": clean_messages,
                "stream": bool(request.stream)
            }
            logger.info(f"ENVIANDO A OLLAMA ({ollama_url}): {json.dumps(ollama_payload)}")
            options = {}
            if request.temperature is not None:
                options["temperature"] = request.temperature
            if request.max_tokens is not None:
                options["num_predict"] = request.max_tokens
            if options:
                ollama_payload["options"] = options
                
            logger.info(f"Delegando inferencia a Ollama en {ollama_url} para {target_model} (stream={request.stream})")
            
            # --- MODO STREAMING (SSE) ---
            if request.stream:
                released_by_stream = True
                async def stream_generator():
                    try:
                        req = urllib.request.Request(
                            ollama_url,
                            data=json.dumps(ollama_payload).encode("utf-8"),
                            headers={"Content-Type": "application/json", "User-Agent": "NexaRouter"},
                            method="POST"
                        )
                        resp = await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=120))
                        
                        while True:
                            line = await asyncio.to_thread(resp.readline)
                            if not line:
                                break
                            line_str = line.decode("utf-8").strip()
                            if not line_str:
                                continue
                            try:
                                data_json = json.loads(line_str)
                                chunk = data_json.get("message", {}).get("content", "")
                                if chunk:
                                    sse_payload = json.dumps({"content": chunk})
                                    yield f"data: {sse_payload}\n\n"
                                if data_json.get("done", False):
                                    break
                            except Exception as json_err:
                                logger.warning(f"Error parseando línea de Ollama: {json_err}")
                        
                        yield "data: [DONE]\n\n"
                    except Exception as stream_err:
                        logger.error(f"Error en streaming de Ollama: {stream_err}")
                        err_str = json.dumps({"error": str(stream_err)})
                        yield f"data: {err_str}\n\n"
                        yield "data: [DONE]\n\n"
                    finally:
                        await queue_manager.release_turn(request_id)
                
                return StreamingResponse(stream_generator(), media_type="text/event-stream")
            
            # --- MODO SINCRO (NON-STREAMING) ---
            def call_ollama():
                req = urllib.request.Request(
                    ollama_url,
                    data=json.dumps(ollama_payload).encode("utf-8"),
                    headers={"Content-Type": "application/json", "User-Agent": "NexaRouter"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=60) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            
            try:
                res = await asyncio.to_thread(call_ollama)
            except Exception as e:
                logger.error(f"Error conectando con Ollama {ollama_url}: {e}")
                raise HTTPException(status_code=503, detail=f"Error en backend de inferencia Ollama: {e}")
                
            content = res.get("message", {}).get("content", "")
            prompt_tokens = res.get("prompt_eval_count", 0)
            completion_tokens = res.get("eval_count", 0)
            
            return {
                "id": f"chatcmpl-{int(time.time())}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": target_model_name,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": content
                    },
                    "finish_reason": "stop"
                }],
                "usage": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens
                }
            }

            
    finally:
        # Liberar el turno en la cola si no fue delegado a stream_generator
        if not released_by_stream:
            await queue_manager.release_turn(request_id)



# ─── F1: Endpoint de diagnóstico Router ↔ ComfyUI ────────────────────────────

@app.get("/comfyui/health")
async def comfyui_health():
    """
    Diagnóstico de conectividad Router ↔ ComfyUI.

    Devuelve el estado de la conexión, GPU y cola de generación.
    No modifica ningún estado ni interactúa con Ollama/VRAM.

    Respuesta OK:
        {"ok": true, "comfyui": "connected", "gpu": "RTX 3090",
         "vram_free_gb": 22.76, "vram_total_gb": 23.56,
         "queue_pending": 0, "queue_running": 0}

    Respuesta si no configurado:
        {"ok": false, "comfyui": "not_configured"}
    """
    if comfyui_client is None:
        return {"ok": False, "comfyui": "not_configured"}

    result = await comfyui_client.health_check()
    return result


class GenerateImageRequest(BaseModel):
    prompt: str

@app.post("/generate-image")
async def generate_image(request: GenerateImageRequest):
    if comfyui_client is None:
        raise HTTPException(status_code=503, detail="ComfyUI client not configured")
        
    request_id = str(uuid.uuid4())
    logger.info(f"Image generation request {request_id}: {request.prompt}")
    
    await queue_manager.request_turn(request_id, {"prompt": request.prompt, "type": "image"})
    
    try:
        workflow = {
            "1": {"class_type": "UnetLoaderGGUF",  "inputs": {"unet_name": "flux1-dev-Q8_0.gguf"}},
            "2": {"class_type": "DualCLIPLoader",  "inputs": {"clip_name1": "clip_l.safetensors", "clip_name2": "t5xxl_fp8_e4m3fn.safetensors", "type": "flux"}},
            "3": {"class_type": "VAELoader",        "inputs": {"vae_name": "ae.safetensors"}},
            "4": {"class_type": "CLIPTextEncode",  "inputs": {"text": request.prompt, "clip": ["2", 0]}},
            "5": {"class_type": "CLIPTextEncode",  "inputs": {"text": "", "clip": ["2", 0]}},
            "6": {"class_type": "EmptyLatentImage","inputs": {"width": 512, "height": 512, "batch_size": 1}},
            "7": {"class_type": "KSampler",        "inputs": {"model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0], "seed": int(time.time()) % 1000000, "steps": 20, "cfg": 3.5, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
            "8": {"class_type": "VAEDecode",       "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
            "9": {"class_type": "SaveImage",       "inputs": {"images": ["8", 0], "filename_prefix": f"nexa_flux_{request_id}"}}
        }
        
        prompt_id = await comfyui_client.post_prompt(workflow, client_id=request_id)
        
        start_time = time.time()
        timeout = 90
        
        while time.time() - start_time < timeout:
            history = await comfyui_client.get_history(prompt_id)
            if history:
                status = history.get("status", {})
                
                # Check for errors first
                messages = status.get("messages", [])
                for msg in messages:
                    if isinstance(msg, list) and len(msg) > 0 and msg[0] == "execution_error":
                        error_msg = msg[1].get("exception_message", "") if len(msg) > 1 else "Unknown execution error"
                        logger.error(f"ComfyUI execution error: {error_msg}")
                        raise HTTPException(status_code=500, detail=f"Image generation failed: {error_msg}")
                
                if status.get("completed") or status.get("status_str") == "success":
                    outputs = history.get("outputs", {})
                    for node_id, node_output in outputs.items():
                        images = node_output.get("images", [])
                        if images:
                            img_info = images[0]
                            filename = img_info.get("filename")
                            subfolder = img_info.get("subfolder", "")
                            img_type = img_info.get("type", "output")
                            image_bytes = await comfyui_client.get_image_bytes(filename, subfolder, img_type)
                            return Response(content=image_bytes, media_type="image/png")
                    
                    raise HTTPException(status_code=500, detail="Image generation completed but no output image found")
                        
            await asyncio.sleep(2)
            
        raise HTTPException(status_code=504, detail="Image generation timed out")
        
    finally:
        await queue_manager.release_turn(request_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

