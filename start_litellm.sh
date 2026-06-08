#!/bin/bash
source ~/vllm-venv/bin/activate
echo "Iniciando Proxy LiteLLM en puerto 4000..."
litellm --config litellm_config.yaml --port 4000
