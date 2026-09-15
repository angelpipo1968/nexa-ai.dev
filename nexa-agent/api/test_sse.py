import asyncio
import json
import base64
from fastapi import Response
import sys
import os

# Añadir ruta para importar módulos
sys.path.append("/app_test")

# Mock classes
class MockGenerateImageRequest:
    def __init__(self, prompt):
        self.prompt = prompt

class MockChatRequest:
    def __init__(self, stream=True):
        self.stream = stream
        self.messages = [{"role": "user", "content": "dibuja un gato"}]
        self.lang = "es"
        self.model = "flux"
        def model_dump():
            return {"messages": self.messages}
        self.model_dump = model_dump

async def mock_generate_image(request):
    # Simula la respuesta PNG binaria
    fake_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'
    return Response(content=fake_png, media_type="image/png")

# Aplicar monkeypatch manual al main module importado
import main
main.generate_image = mock_generate_image
main.classify_intent = lambda msgs, has_img, lang: "text2image"

# Necesitamos bypassear dependencias como QueueManager
class MockQueueManager:
    async def request_turn(self, req_id, payload): pass
    async def release_turn(self, req_id): pass

main.queue_manager = MockQueueManager()

async def run_test():
    print("--- INICIANDO TEST UNITARIO SSE ---")
    req = MockChatRequest(stream=True)
    
    response = await main.chat_completions(req)
    
    # response is StreamingResponse
    print("Respuesta recibida tipo:", type(response))
    
    # Consumir el iterador
    events = []
    async for chunk in response.body_iterator:
        events.append(chunk)
        print("Chunk recibido:", chunk.strip())
        
    if not events:
        print("FAIL: No hay eventos SSE")
        sys.exit(1)
        
    first_event = events[0].replace("data: ", "").strip()
    try:
        data = json.loads(first_event)
        if data.get("type") != "image":
            print("FAIL: type no es image")
            sys.exit(1)
        if not data.get("image_url", "").startswith("data:image/png;base64,"):
            print("FAIL: image_url no tiene formato base64 correcto")
            sys.exit(1)
            
        b64 = data["image_url"].split("base64,")[1]
        decoded = base64.b64decode(b64)
        if not decoded.startswith(b'\x89PNG'):
            print("FAIL: El contenido decodificado no es PNG")
            sys.exit(1)
            
    except Exception as e:
        print("FAIL parsing JSON:", e)
        sys.exit(1)
        
    last_event = events[-1].strip()
    if last_event != "data: [DONE]":
        print(f"FAIL: El evento final no es [DONE]. Es: {last_event}")
        sys.exit(1)
        
    print("PASS: Todas las aserciones correctas.")

if __name__ == "__main__":
    asyncio.run(run_test())
