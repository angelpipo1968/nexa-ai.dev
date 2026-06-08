import { logEvent } from "./observability";

const VLLM_HEALTH_URL = "http://localhost:8002/v1/models";

export async function checkVLLM() {
  try {
    const res = await fetch(VLLM_HEALTH_URL);
    return res.ok;
  } catch {
    return false;
  }
}

export function startWatchdog() {
    setInterval(async () => {
        const ok = await checkVLLM();
        if (!ok) {
            console.error("⚠️ vLLM down → Forzando reinicio de seguridad.");
            await logEvent("system_crash", { service: "vllm" });
            process.exit(1); // PM2 atrapará esta salida y reiniciará el worker
        }
    }, 10000); // Check cada 10 segundos
}
