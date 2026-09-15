import subprocess
import time
import sys

def get_vram():
    result = subprocess.run(
        ['nvidia-smi', '--query-gpu=memory.used', '--format=csv,nounits,noheader'],
        capture_output=True, text=True
    )
    try:
        return int(result.stdout.strip())
    except:
        return 0

print("=== Monitor de VRAM para RTX 3090 ===")
print("Presiona Ctrl+C para detener y ver el reporte máximo.\n")

vram_idle = get_vram()
print(f"VRAM Idle (Base): {vram_idle} MB ({vram_idle/1024:.2f} GB)")

max_vram = vram_idle
try:
    while True:
        current = get_vram()
        if current > max_vram:
            max_vram = current
            print(f"Nuevo pico de VRAM detectado: {max_vram} MB ({max_vram/1024:.2f} GB)")
        time.sleep(0.5)
except KeyboardInterrupt:
    print("\n\n=== REPORTE DE MEDICIÓN ===")
    print(f"VRAM Idle Inicial : {vram_idle} MB ({vram_idle/1024:.2f} GB)")
    print(f"VRAM Pico Máximo  : {max_vram} MB ({max_vram/1024:.2f} GB)")
    
    current_final = get_vram()
    print(f"VRAM Final (Post) : {current_final} MB ({current_final/1024:.2f} GB)")
    print("===========================")
