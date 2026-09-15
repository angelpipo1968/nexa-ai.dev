import logging
import urllib.request
import json

logger = logging.getLogger(__name__)

EDIT_VERBS = {
    "es": ["pon", "mete", "cambia", "transforma", "edita", "modifica", 
           "ponlo", "ponla", "colócalo", "colócala", "muévelo", "muévela",
           "cámbialo", "cámbiala", "vístelo", "vístela", "sácalo", "sácala"],
    "en": ["put", "place", "move", "change", "transform", "edit",
           "make", "dress", "take out", "show in"]
}

GEN_VERBS = {
    "es": ["crea", "genera", "dibuja", "imagina", "hazme", "muéstrame",
           "pinta", "ilustra", "diseña"],
    "en": ["create", "generate", "draw", "imagine", "make", "show",
           "paint", "illustrate", "design"]
}

def classify_intent(messages: list, has_images: bool, lang: str) -> str:
    """
    Devuelve uno de:
      "caption"       → imagen + pregunta descriptiva
      "image_edit"    → imagen + instrucción de transformación
      "text2image"    → sin imagen + instrucción de generación
      "agent"         → requiere herramientas del sistema o información de infraestructura
      "text"          → conversación de texto puro normal
    """
    if not messages:
        return "text"

    # Obtener el último mensaje del usuario
    last_user_msg = ""
    for m in reversed(messages):
        m_dict = m.model_dump() if hasattr(m, "model_dump") else (m.dict() if hasattr(m, "dict") else m)
        if isinstance(m_dict, dict) and m_dict.get("role") == "user":
            content = m_dict.get("content", "")
            if isinstance(content, list):
                text_parts = [item.get("text", "") for item in content if isinstance(item, dict) and item.get("type") == "text"]
                last_user_msg = " ".join(text_parts).lower()
            elif isinstance(content, str):
                last_user_msg = content.lower()
            break

    # Check if the assistant asked for confirmation in the previous turn
    last_assistant_msg = ""
    for m in reversed(messages):
        m_dict = m.model_dump() if hasattr(m, "model_dump") else (m.dict() if hasattr(m, "dict") else m)
        if isinstance(m_dict, dict) and m_dict.get("role") == "assistant":
            content = m_dict.get("content", "")
            if isinstance(content, str):
                last_assistant_msg = content
            break
            
    if "CONFIRM_REQUIRED" in last_assistant_msg.upper():
        return "agent"

    lang_prefix = "es" if lang and lang.startswith("es") else "en"
    
    if has_images:
        # Check for edit verbs
        for verb in EDIT_VERBS.get(lang_prefix, EDIT_VERBS["es"]):
            if verb in last_user_msg:
                return "image_edit"
        return "caption"
    else:
        # Check for generation verbs
        for verb in GEN_VERBS.get(lang_prefix, GEN_VERBS["es"]):
            if verb in last_user_msg:
                return "text2image"
                
        # --- ZERO-SHOT LLM INTENT CLASSIFICATION ---
        prompt = (
            "Classify the following user message into exactly one of these two categories:\n"
            "- AGENT: if the user is asking to interact with the system infrastructure, check system health, "
            "vram, memory, gpu, configurations, read logs, restart services, load models, or asks 'what is happening in the system?'.\n"
            "- CHAT: if it is a normal conversational question, a greeting, or any task that does NOT require system tools.\n\n"
            f"User message: \"{last_user_msg}\"\n\n"
            "Reply ONLY with the word AGENT or CHAT."
        )
        
        payload = {
            "model": "deepseek-v3-lite:latest",
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "options": {
                "temperature": 0.0,
                "num_predict": 5
            }
        }
        
        try:
            req = urllib.request.Request(
                "http://host.docker.internal:11434/api/chat",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            # Timeout largo porque si el modelo no está cargado, lo cargará (y lo necesitaremos igual para la respuesta)
            with urllib.request.urlopen(req, timeout=60.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                reply = data.get("message", {}).get("content", "").strip().upper()
                
                if "AGENT" in reply:
                    return "agent"
                else:
                    return "text"
        except Exception as e:
            logger.warning(f"Error in LLM zero-shot classification: {e}. Fallback to text.")
            return "text"
