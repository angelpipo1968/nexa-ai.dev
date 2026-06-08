import { redis } from './redis';

// Como usamos Upstash REST, simularemos el Event Stream usando Redis Lists.
// El Worker hará RPUSH de los tokens.
// El Gateway hará LPOP en bucle para enviarlos al cliente.

export async function publishChunk(jobId: string, chunk: string) {
    await redis.rpush(`stream:${jobId}`, chunk);
    // Para no ensuciar la base de datos, el stream expira en 1 hora
    await redis.expire(`stream:${jobId}`, 3600);
}

export async function publishDone(jobId: string) {
    await redis.rpush(`stream:${jobId}`, '[DONE]');
}

export async function publishError(jobId: string, errorMsg: string) {
    await redis.rpush(`stream:${jobId}`, `[ERROR] ${errorMsg}`);
    await redis.rpush(`stream:${jobId}`, '[DONE]');
}

// Consumidor para el Gateway (Polling ligero)
export async function consumeChunk(jobId: string): Promise<string | null> {
    // Usamos LPOP para sacar el token de la lista destructivamente.
    // Como Upstash no soporta BLPOP por REST de forma nativa/confiable sin timeouts de Vercel,
    // usaremos LPOP regular.
    const chunk = await redis.lpop(`stream:${jobId}`);
    return chunk ? (chunk as string) : null;
}
