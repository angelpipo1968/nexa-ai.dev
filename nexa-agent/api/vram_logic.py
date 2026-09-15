import builtins
import subprocess
import urllib.request
import json
import logging
import time
import torch
import sys
from typing import Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)



def get_gpu_used_vram_gb() -> float:
    """Lee la VRAM usada real de la RTX 3090 via nvidia-smi.
    Devuelve 0.0 si nvidia-smi no está disponible (fallback seguro).
    """
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=3
        )
        if result.returncode == 0 and result.stdout.strip():
            mib = int(result.stdout.strip().splitlines()[0])
            return round(mib / 1024, 2)
    except Exception as e:
        logger.warning(f"nvidia-smi no disponible: {e}")
    return 0.0

@dataclass
class ModelInfo:
    name: str
    size_gb: float
    path: str
    loaded: bool = False
    last_used: float = 0

def find_ollama_host() -> Optional[str]:
    for host in ["172.18.0.1", "172.17.0.1", "host.docker.internal", "localhost", "127.0.0.1"]:
        url = f"http://{host}:11434/api/tags"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NexaRouter"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    return host
        except Exception:
            continue
    return None

def get_ollama_models(host: str) -> list:
    url = f"http://{host}:11434/api/tags"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "NexaRouter"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return [m.get("name") for m in data.get("models", [])]
    except Exception as e:
        logger.error(f"Error obteniendo modelos de Ollama: {e}")
        return []

def query_ollama(host: str, model_name: str, messages: list, max_tokens: int = 200, temperature: float = 0.7) -> dict:
    url = f"http://{host}:11434/api/chat"
    payload = {
        "model": model_name,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "NexaRouter"},
        method="POST"
    )
    
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        
    content = data.get("message", {}).get("content", "")
    prompt_eval_count = data.get("prompt_eval_count", 0)
    eval_count = data.get("eval_count", 0)
    
    return {
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model_name,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": content
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": prompt_eval_count,
            "completion_tokens": eval_count,
            "total_tokens": prompt_eval_count + eval_count
        }
    }

class DummyTensor:
    def __init__(self, data):
        self.input_ids = data
        self.data = data
    def to(self, device):
        return self
    def __len__(self):
        return len(self.data)
    def __getitem__(self, idx):
        return self.data[idx]

class DummyTokenizer:
    def __init__(self, host, target_m):
        self.host = host
        self.target_m = target_m
        self.eos_token_id = 0
        self.last_messages = []
        self.last_response_text = ""

    def apply_chat_template(self, messages, tokenize=False, add_generation_prompt=True):
        self.last_messages = messages
        return json.dumps(messages)

    def __call__(self, text, return_tensors=None):
        return DummyTensor([[1, 2, 3]])

    def decode(self, generated_ids, skip_special_tokens=True):
        return self.last_response_text

class OllamaModelEngine:
    def __init__(self, host, target_m, tok):
        self.host = host
        self.target_m = target_m
        self.tok = tok

    def parameters(self):
        class DummyParam:
            device = torch.device("cpu")
        yield DummyParam()

    def generate(self, input_ids=None, max_new_tokens=200, temperature=0.7, **kwargs):
        res = query_ollama(
            self.host,
            self.target_m,
            self.tok.last_messages,
            max_tokens=max_new_tokens or 200,
            temperature=temperature or 0.7
        )
        content = res["choices"][0]["message"]["content"]
        self.tok.last_response_text = content
        return [[1, 2, 3, 4]]
