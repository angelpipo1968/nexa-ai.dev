import { redis } from './redis';
import { AgentJob } from './types';
import { v4 as uuidv4 } from 'uuid';

const MAX_TOKENS_PER_DAY = 50000;

export async function enqueueJob(
  agentId: string, 
  messages: any[], 
  type: AgentJob['type'] = 'chat', 
  priority = 1
): Promise<string> {
  // 1. Token Budgeting
  const today = new Date().toISOString().split('T')[0];
  const usageKey = `tokens:usage:${agentId}:${today}`;
  const usedTokens = await redis.get<number>(usageKey) || 0;
  
  if (usedTokens > MAX_TOKENS_PER_DAY) {
    throw new Error(`Agent ${agentId} ha excedido su presupuesto diario de tokens.`);
  }

  // 2. Estimating tokens (approx 4 chars = 1 token)
  const inputStr = JSON.stringify(messages);
  const inputTokens = Math.ceil(inputStr.length / 4);

  // Pre-emptive Kill Switch: No dejar entrar monstruosidades
  if (inputTokens > 8000) {
    throw new Error(`Prompt explosion detectada (${inputTokens} tokens). Job abortado.`);
  }

  // 3. Create Job
  const job: AgentJob = {
    id: `job_${uuidv4()}`,
    agent_id: agentId,
    type,
    priority,
    input_tokens: inputTokens,
    max_tokens: 1024,
    model: 'qwen2.5:32b',
    messages,
    status: 'queued',
    created_at: Date.now()
  };

  // 4. Queue routing: ZADD allows priority (lower number = higher priority)
  const queueName = `queue:${type}`;
  await redis.zadd(queueName, { score: priority, member: JSON.stringify(job) });
  
  // Store isolated state
  await redis.set(`job:${job.id}`, job, { ex: 3600 }); // Expira en 1 hora

  return job.id;
}

export async function getJobStatus(jobId: string): Promise<AgentJob | null> {
  return await redis.get<AgentJob>(`job:${jobId}`);
}
