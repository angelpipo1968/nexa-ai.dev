#!/bin/bash

# ==========================================================
# NEXA AI - Pipeline Continuation Script
# Waits for active download (PID 806748) and completes GGUF
# ==========================================================

LOG_FILE="/home/angel/quantize_progress.log"
TARGET_PID=806748

echo "$(date): Pipeline continuation script started. Monitoring PID $TARGET_PID..." >> "$LOG_FILE"

# 1. Wait for active download to finish
while kill -0 $TARGET_PID 2>/dev/null; do
    sleep 30
done

echo "$(date): Download PID $TARGET_PID finished. Validating download directory..." >> "$LOG_FILE"

if [ ! -d "/home/angel/models/qwen2.5-32b-instruct" ]; then
    echo "$(date): Error: Download directory not found. Pipeline failed." >> "$LOG_FILE"
    exit 1
fi

# 2. Activate environment
source "/home/angel/quant-env/bin/activate"

# 3. Convert HF to F16 GGUF
echo "$(date): Starting F16 conversion..." >> "$LOG_FILE"
if python3 /home/angel/llama.cpp/convert_hf_to_gguf.py \
  /home/angel/models/qwen2.5-32b-instruct \
  --outtype f16 \
  --outfile /home/angel/models/qwen2.5-32b-instruct-f16.gguf >> "$LOG_FILE" 2>&1; then
    echo "$(date): F16 Conversion complete." >> "$LOG_FILE"
else
    echo "$(date): Error: F16 Conversion failed." >> "$LOG_FILE"
    exit 1
fi

# 4. Quantize to Q4_K_M
echo "$(date): Starting Q4_K_M quantization..." >> "$LOG_FILE"
if /home/angel/llama.cpp/build/bin/llama-quantize \
  /home/angel/models/qwen2.5-32b-instruct-f16.gguf \
  /home/angel/models/qwen2.5-32b-instruct-q4_k_m.gguf \
  q4_k_m >> "$LOG_FILE" 2>&1; then
    echo "$(date): Quantization complete." >> "$LOG_FILE"
else
    echo "$(date): Error: Quantization failed." >> "$LOG_FILE"
    exit 1
fi

# 5. Import into Ollama
echo "$(date): Creating Modelfile and importing to Ollama..." >> "$LOG_FILE"
TEMP_MODELFILE="/home/angel/Modelfile_qwen2.5-32b"
echo "FROM /home/angel/models/qwen2.5-32b-instruct-q4_k_m.gguf" > "$TEMP_MODELFILE"

if ollama create qwen2.5-32b-instruct-nexa -f "$TEMP_MODELFILE" >> "$LOG_FILE" 2>&1; then
    echo "$(date): Ollama import complete. Model is now ready!" >> "$LOG_FILE"
else
    echo "$(date): Error: Ollama import failed." >> "$LOG_FILE"
    rm -f "$TEMP_MODELFILE"
    exit 1
fi

# 6. Cleanup
echo "$(date): Cleaning up temporary F16 and HF download files..." >> "$LOG_FILE"
rm -f /home/angel/models/qwen2.5-32b-instruct-f16.gguf
rm -f "$TEMP_MODELFILE"
rm -rf /home/angel/models/qwen2.5-32b-instruct
echo "$(date): Pipeline completed successfully!" >> "$LOG_FILE"
