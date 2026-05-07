import os from 'node:os';
import { execSync } from 'node:child_process';

export class RealTimeMetrics {
    private static lastCpuUsage = { idle: 0, total: 0 };

    static getCPUUsage(): number {
        const cpus = os.cpus();
        let idle = 0;
        let total = 0;

        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                total += (cpu.times as any)[type];
            }
            idle += cpu.times.idle;
        });

        const deltaIdle = idle - this.lastCpuUsage.idle;
        const deltaTotal = total - this.lastCpuUsage.total;

        this.lastCpuUsage = { idle, total };

        if (deltaTotal === 0) return 0;
        return Math.floor(100 * (1 - deltaIdle / deltaTotal));
    }

    static getMemoryUsage(): number {
        const free = os.freemem();
        const total = os.totalmem();
        return Math.floor(100 * (1 - free / total));
    }

    static async getOllamaLoad(): Promise<number> {
        try {
            // En Windows, podemos intentar ver si el proceso está activo o si responde
            // Por ahora, simulamos una carga baja si responde el ping
            const start = Date.now();
            const response = await fetch('http://localhost:11434/api/tags');
            if (response.ok) {
                const latency = Date.now() - start;
                // Si la latencia es alta (>500ms), asumimos carga alta
                return Math.min(100, Math.floor(latency / 10));
            }
            return 0;
        } catch {
            return 0; // Ollama no disponible
        }
    }

    static async getAll() {
        return {
            cpu: this.getCPUUsage(),
            ram: this.getMemoryUsage(),
            ollama: await this.getOllamaLoad(),
            timestamp: new Date().toISOString()
        };
    }
}
