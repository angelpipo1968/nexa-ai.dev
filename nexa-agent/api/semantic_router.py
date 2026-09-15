import json
import urllib.request
import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class SemanticOrchestrator:
    """
    Clasifica la intención del usuario y traduce los prompts para la generación/edición de imágenes.
    Se comunica con un LLM rápido (ej. deepseek-v3-lite) vía Ollama para tomar la decisión.
    """
    def __init__(self, ollama_url: str = "http://172.18.0.1:11434/api/generate", default_model: str = "deepseek-v3-lite"):
        self.ollama_url = ollama_url
        self.default_model = default_model

    async def classify_intent(self, text: str, has_images: bool, model: Optional[str] = None) -> Dict[str, Any]:
        """
        Analiza el texto y determina la intención.
        Retorna un diccionario con: intent, language, translated_prompt, preserve_subject.
        """
        target_model = model or self.default_model

        system_prompt = f"""Eres el Orquestador Semántico del sistema NEXA. 
Tu única tarea es analizar la petición del usuario y extraer su intención estructurada en JSON.
¿El usuario adjuntó una imagen de referencia?: {str(has_images).lower()}

Reglas de Intención (intent):
- IMAGE_EDIT: El usuario pide modificar la imagen adjunta o cambiar su contexto/fondo. (Ej: "ponlo en un bosque", "hazlo estilo anime").
- IMAGE_DESCRIBE: El usuario hace una pregunta sobre la imagen adjunta. (Ej: "¿qué raza es el perro?", "describe esto").
- IMAGE_GENERATE: El usuario pide generar una imagen desde cero. (Ej: "dibuja un gato", "genera un paisaje").
- TEXT_ONLY: Petición de texto general sin relación con generar o editar imágenes.

Debes devolver ÚNICAMENTE un objeto JSON estricto, sin texto adicional, markdown o explicaciones.

Estructura obligatoria:
{{
  "intent": "IMAGE_EDIT" | "IMAGE_DESCRIBE" | "IMAGE_GENERATE" | "TEXT_ONLY",
  "language": "es" | "en" | etc,
  "translated_prompt": "El prompt traducido al inglés optimizado para un modelo generador de imágenes. Vacío si es TEXT_ONLY o IMAGE_DESCRIBE.",
  "preserve_subject": true o false (true si quiere conservar el sujeto de la imagen adjunta)
}}"""

        payload = {
            "model": target_model,
            "system": system_prompt,
            "prompt": f"Petición del usuario: \"{text}\"",
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,  # Muy baja para respuestas deterministas
                "num_predict": 150
            }
        }

        try:
            req = urllib.request.Request(
                self.ollama_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "NexaRouter"},
                method="POST"
            )
            
            # Realizamos la petición de forma asíncrona
            resp = await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=10))
            resp_body = resp.read().decode("utf-8")
            data = json.loads(resp_body)
            
            result_text = data.get("response", "{}")
            result_json = json.loads(result_text)
            
            # Sanitización / Valores por defecto en caso de alucinaciones
            return {
                "intent": result_json.get("intent", "TEXT_ONLY"),
                "language": result_json.get("language", "es"),
                "translated_prompt": result_json.get("translated_prompt", ""),
                "preserve_subject": result_json.get("preserve_subject", False)
            }
            
        except Exception as e:
            logger.error(f"Error en SemanticOrchestrator: {e}")
            # Fallback seguro
            if has_images:
                return {"intent": "IMAGE_DESCRIBE", "language": "es", "translated_prompt": "", "preserve_subject": False}
            else:
                return {"intent": "TEXT_ONLY", "language": "es", "translated_prompt": "", "preserve_subject": False}

# --- Código de prueba rápida (si se ejecuta directamente) ---
if __name__ == "__main__":
    async def test():
        orchestrator = SemanticOrchestrator()
        
        tests = [
            ("quiero este perrito en un bosque", True),
            ("¿de qué color es la camisa del hombre de la foto?", True),
            ("genera una imagen fotorrealista de un gato astronauta en marte", False),
            ("cuéntame un chiste de programadores", False)
        ]
        
        for text, has_image in tests:
            print(f"\n[TEXTO]: '{text}' | [IMAGEN ADJUNTA]: {has_image}")
            res = await orchestrator.classify_intent(text, has_image)
            print(json.dumps(res, indent=2))

    asyncio.run(test())
