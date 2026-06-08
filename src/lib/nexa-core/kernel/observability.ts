import { redis } from "./redis";
import { execSync } from "child_process";

export async function logEvent(type: string, data: any) {
  await redis.lpush("logs:system", JSON.stringify({
    type,
    data,
    ts: Date.now()
  }));
  // Mantenemos solo los últimos 1000 logs para no saturar Redis
  await redis.ltrim("logs:system", 0, 999);
}

export async function logGPU() {
  try {
    const output = execSync("nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits");
    const [util, mem, total] = output.toString().trim().split(",");
    
    const utilPct = parseInt(util, 10);
    const memUsed = parseInt(mem, 10);
    const memTotal = parseInt(total, 10);
    const memPct = (memUsed / memTotal) * 100;

    await redis.lpush("metrics:gpu", JSON.stringify({
      util: utilPct,
      memUsed,
      memPct,
      ts: Date.now()
    }));
    await redis.ltrim("metrics:gpu", 0, 999);

    // Watchdog de seguridad (Kill Switch pasivo)
    if (memPct > 95) {
        logEvent("gpu_warning", { message: "VRAM > 95%. Posible riesgo de OOM." });
    }
  } catch (error) {
    // Falla silenciada si nvidia-smi no está disponible temporalmente
  }
}
