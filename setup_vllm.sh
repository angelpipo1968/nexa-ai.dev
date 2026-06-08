#!/bin/bash
set -e

echo "======================================"
echo " Instalador de Entorno vLLM + LiteLLM"
echo "======================================"

echo "1. Creando entorno virtual (python3.12)..."
python3.12 -m venv ~/vllm-venv

echo "2. Activando entorno..."
source ~/vllm-venv/bin/activate

echo "3. Instalando vLLM y LiteLLM..."
pip install vllm litellm

echo "4. Flash Attention V2 (Opcional)"
echo "Nota: vLLM ya trae sus propios kernels optimizados. Para compilar flash-attn externo necesitas instalar CUDA Toolkit (nvcc) en Ubuntu primero."

echo "======================================"
echo " ¡Instalación Completada Exitosamente!"
echo "======================================"
