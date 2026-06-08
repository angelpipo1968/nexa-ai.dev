import { redis } from './redis';

// System-wide memory for an agent/user session
export async function saveAgentMemory(agentId: string, key: string, value: any) {
    await redis.hset(`agent_memory:${agentId}`, { [key]: value });
}

export async function getAgentMemory(agentId: string, key: string) {
    return await redis.hget(`agent_memory:${agentId}`, key);
}

// Persistent session summaries (outside of KV cache)
export async function addSessionSummary(agentId: string, summary: string) {
    await redis.lpush(`session_summary:${agentId}`, summary);
    // Keep only the last 10 summaries to avoid DB bloating
    await redis.ltrim(`session_summary:${agentId}`, 0, 9);
}

export async function getSessionSummaries(agentId: string) {
    return await redis.lrange(`session_summary:${agentId}`, 0, -1);
}

export async function addToolHistory(agentId: string, toolName: string, success: boolean) {
    await redis.lpush(`tool_history:${agentId}`, JSON.stringify({ tool: toolName, success, timestamp: Date.now() }));
    await redis.ltrim(`tool_history:${agentId}`, 0, 49);
}
