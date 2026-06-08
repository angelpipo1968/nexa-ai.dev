#!/bin/bash
source ~/vllm-venv/bin/activate

echo "Iniciando servidor vLLM con Qwen2.5-32B-AWQ..."
echo "Parámetros: awq_marlin, KV FP8, 4096 max-len, 0.85 VRAM."

export CUDA_VISIBLE_DEVICES=0
python -m vllm.entrypoints.openai.api_server \
  --enforce-eager \
  --model Qwen/Qwen2.5-32B-Instruct-AWQ \
  --gpu-memory-utilization 0.65 \
  --kv-cache-dtype fp8 \
  --max-model-len 4096 \
  --max-num-seqs 8 \
  --max-num-batched-tokens 8192 \
  --enable-prefix-caching \
  --host 0.0.0.0 \
  --port 8002
