import { redis } from './redis';
import { AgentJob } from './types';
import { publishChunk, publishDone, publishError } from './event-bus';
import { logEvent } from './observability';

const LITELLM_URL = 'http://127.0.0.1:4001/v1/chat/completions';
const MAX_CONCURRENT_WORKERS = 1; // 1 Worker exclusivo para la RTX 3090 (Aislamiento Total)
let isProcessing = false;

async function processNextJob() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // 1. Sacar el trabajo con mayor prioridad de la cola
    const result = await redis.zpopmin('queue:chat', 1);
    if (!result || result.length === 0) {
      isProcessing = false;
      return;
    }

    const jobJson = result[0];
    const job: AgentJob = JSON.parse(jobJson as string);

    // 2. Marcar como processing
    job.status = 'processing';
    await redis.set(`job:${job.id}`, job, { ex: 3600 });
    await logEvent('job_started', { job_id: job.id, agent: job.agent_id });

    console.log(`[WORKER] Procesando Job ${job.id} para Agente ${job.agent_id}`);

    // 3. WATCHDOG KILL SWITCH: 3 Minutos max
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        console.warn(`[WATCHDOG] Job ${job.id} excedió tiempo máximo. Abortando (KILL SWITCH).`);
        controller.abort();
    }, 180000); 

    let fullResponse = '';

    try {
      // 4. Enviar a LiteLLM con stream: true
      const llmRes = await fetch(LITELLM_URL, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-local'
        },
        body: JSON.stringify({
            model: job.model,
            messages: job.messages,
            max_tokens: job.max_tokens,
            stream: true // STREAM ACTIVADO
        }),
        signal: controller.signal
      });

      if (!llmRes.ok || !llmRes.body) {
        throw new Error(`LiteLLM Error: ${llmRes.statusText}`);
      }

      // 5. Consumir el Stream y Publicar Fragmentos
      const reader = llmRes.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
              if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                  try {
                      const data = JSON.parse(line.slice(6));
                      const content = data.choices[0]?.delta?.content;
                      if (content) {
                          fullResponse += content;
                          // Publicar al bus de eventos
                          await publishChunk(job.id, content);
                      }
                  } catch (e) {}
              }
          }
      }

      clearTimeout(timeout);
      
      // Cerrar el stream
      await publishDone(job.id);

      // 6. Trabajo completado con éxito
      job.status = 'completed';
      job.result = fullResponse;
      await redis.set(`job:${job.id}`, job, { ex: 3600 });
      await logEvent('job_completed', { job_id: job.id, tokens: fullResponse.length });
      console.log(`[WORKER] Job ${job.id} Completado.`);

      // 7. Actualizar Token Budget
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `tokens:usage:${job.agent_id}:${today}`;
      const usedTokens = job.input_tokens + Math.ceil(fullResponse.length / 4);
      await redis.incrby(usageKey, usedTokens);

    } catch (e: any) {
      clearTimeout(timeout);
      console.error(`[WORKER] Job ${job.id} Falló: ${e.message}`);
      job.status = e.name === 'AbortError' ? 'killed' : 'failed';
      job.error = e.message;
      await redis.set(`job:${job.id}`, job, { ex: 3600 });
      await publishError(job.id, e.message);
      await logEvent('job_failed', { job_id: job.id, error: e.message });
    }

  } catch (error) {
    console.error(`[WORKER] Error interno:`, error);
  } finally {
    isProcessing = false;
  }
}

// Bucle principal del worker
export function startWorkerPool() {
  console.log(`[KERNEL] Worker Pool iniciado. Aislamiento GPU activado (Max: ${MAX_CONCURRENT_WORKERS})`);
  setInterval(processNextJob, 500); // Poll cada 500ms
}
