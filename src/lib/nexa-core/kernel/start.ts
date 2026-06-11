import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

import { startWorkerPool } from './worker';
import { logGPU } from './observability';
import { startWatchdog } from './health';

console.log("===================================");
console.log("🚀 INICIANDO NEXAS AGENT KERNEL v1.2 (OS 24/7)");
console.log("===================================");
console.log("Activando Watchdog y GPU Monitor...");

startWatchdog();
setInterval(logGPU, 2000); // Métrica cada 2 segundos

startWorkerPool();
