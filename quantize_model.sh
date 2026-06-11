#!/bin/bash

# ==========================================================
# NEXA AI - Unified Model Quantization & Ollama Import Script
# ==========================================================

set -e # Exit immediately on errors

# Colors for UI
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
DEFAULT_QUANT="q4_k_m"

# Show Usage if arguments are missing
if [ "$#" -lt 2 ]; then
    echo -e "${RED}Error: Missing arguments.${NC}"
    echo -e "Usage: $0 <HF_MODEL_REPO> <OLLAMA_MODEL_NAME> [QUANT_TYPE]"
    echo -e "Example: $0 Qwen/Qwen2.5-7B-Instruct qwen-local q4_k_m"
    exit 1
fi

HF_MODEL="$1"
OLLAMA_NAME="$2"
QUANT_TYPE="${3:-$DEFAULT_QUANT}"

# Setup directory paths
MODEL_DIR_NAME=$(echo "$HF_MODEL" | tr '/' '_' | tr '[:upper:]' '[:lower:]')
TEMP_DOWNLOAD_DIR="/home/angel/models/$MODEL_DIR_NAME"
F16_GGUF_FILE="/home/angel/models/${MODEL_DIR_NAME}-f16.gguf"
FINAL_GGUF_FILE="/home/angel/models/${MODEL_DIR_NAME}-${QUANT_TYPE}.gguf"
LOG_FILE="/home/angel/quantize_progress.log"

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}     NEXA MODEL QUANTIZATION PIPELINE          ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${YELLOW}HuggingFace Repo:${NC} $HF_MODEL"
echo -e "${YELLOW}Ollama Name:${NC}      $OLLAMA_NAME"
echo -e "${YELLOW}Quantization:${NC}     $QUANT_TYPE"
echo -e "${YELLOW}Progress Logs:${NC}    $LOG_FILE"
echo -e "${BLUE}-----------------------------------------------${NC}"

# Log start time
echo "$(date): Starting pipeline for $HF_MODEL -> $OLLAMA_NAME ($QUANT_TYPE)" >> "$LOG_FILE"

# 1. Activate Environment
echo -e "${YELLOW}[1/5] Activating virtual environment...${NC}"
if [ -f "/home/angel/quant-env/bin/activate" ]; then
    source "/home/angel/quant-env/bin/activate"
    echo -e "${GREEN}✓ Environment activated.${NC}"
else
    echo -e "${RED}Error: Virtual env not found at ~/quant-env${NC}"
    exit 1
fi

# 2. Download Model from HuggingFace
echo -e "${YELLOW}[2/5] Downloading model from HuggingFace (this may take a while)...${NC}"
mkdir -p "/home/angel/models"
if hf download "$HF_MODEL" --local-dir "$TEMP_DOWNLOAD_DIR" >> "$LOG_FILE" 2>&1; then
    echo -e "${GREEN}✓ Download complete.${NC}"
else
    echo -e "${RED}Error: Download failed. Check $LOG_FILE for details.${NC}"
    exit 1
fi

# 3. Convert HF weights to F16 GGUF
echo -e "${YELLOW}[3/5] Converting weights to F16 GGUF...${NC}"
if python3 /home/angel/llama.cpp/convert_hf_to_gguf.py "$TEMP_DOWNLOAD_DIR" --outtype f16 --outfile "$F16_GGUF_FILE" >> "$LOG_FILE" 2>&1; then
    echo -e "${GREEN}✓ F16 Conversion complete.${NC}"
else
    echo -e "${RED}Error: F16 Conversion failed. Check $LOG_FILE for details.${NC}"
    exit 1
fi

# 4. Quantize GGUF to Target Type
echo -e "${YELLOW}[4/5] Compressing model to $QUANT_TYPE...${NC}"
if /home/angel/llama.cpp/build/bin/llama-quantize "$F16_GGUF_FILE" "$FINAL_GGUF_FILE" "$QUANT_TYPE" >> "$LOG_FILE" 2>&1; then
    echo -e "${GREEN}✓ Quantization complete.${NC}"
else
    echo -e "${RED}Error: Quantization failed. Check $LOG_FILE for details.${NC}"
    exit 1
fi

# 5. Import to Ollama
echo -e "${YELLOW}[5/5] Creating Modelfile and importing into Ollama...${NC}"
TEMP_MODELFILE="/home/angel/Modelfile_${OLLAMA_NAME}"
echo "FROM $FINAL_GGUF_FILE" > "$TEMP_MODELFILE"

if ollama create "$OLLAMA_NAME" -f "$TEMP_MODELFILE" >> "$LOG_FILE" 2>&1; then
    echo -e "${GREEN}✓ Imported into Ollama successfully!${NC}"
else
    echo -e "${RED}Error: Ollama import failed. Check $LOG_FILE for details.${NC}"
    rm -f "$TEMP_MODELFILE"
    exit 1
fi

# Cleanup
echo -e "${YELLOW}Cleaning up temporary files to free disk space...${NC}"
rm -f "$F16_GGUF_FILE"
rm -f "$TEMP_MODELFILE"
rm -rf "$TEMP_DOWNLOAD_DIR"
echo -e "${GREEN}✓ Cleanup complete.${NC}"

echo "$(date): Pipeline finished successfully for $OLLAMA_NAME" >> "$LOG_FILE"
echo -e "\n${GREEN}===============================================${NC}"
echo -e "${GREEN}  SUCCESS: Model is ready in Ollama!${NC}"
echo -e "${GREEN}  Run 'ollama run $OLLAMA_NAME' to test it.${NC}"
echo -e "${GREEN}===============================================${NC}\n"
