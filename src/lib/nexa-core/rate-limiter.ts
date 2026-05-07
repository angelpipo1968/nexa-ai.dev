// ═══════════════════════════════════════════
//  NEXA CORE — Rate Limiter
//  Sin dependencias externas, en memoria
// ═══════════════════════════════════════════

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
    /** Máximo de requests por ventana */
    maxRequests: number;
    /** Ventana de tiempo en milisegundos */
    windowMs: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfterMs?: number;
}

/**
 * Verifica rate limit para un identificador (IP, user ID, etc.)
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { maxRequests: 30, windowMs: 60_000 }
): RateLimitResult {
    const now = Date.now();
    const key = `ratelimit:${identifier}`;
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        // Nueva ventana
        store.set(key, { count: 1, resetAt: now + config.windowMs });
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetAt: now + config.windowMs,
        };
    }

    if (entry.count >= config.maxRequests) {
        // Límite excedido
        return {
            allowed: false,
            remaining: 0,
            resetAt: entry.resetAt,
            retryAfterMs: entry.resetAt - now,
        };
    }

    // Incrementar contador
    entry.count++;
    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
    };
}

/**
 * Extrae el identificador del request (IP o user ID)
 */
export function getIdentifier(request: Request): string {
    // Intentar obtener IP real detrás de proxy
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown';
    return ip;
}

/**
 * Configuraciones predefinidas
 */
export const RATE_LIMITS = {
    /** Chat: 30 mensajes por minuto */
    chat: { maxRequests: 30, windowMs: 60_000 },
    /** Visión: 10 análisis por minuto (más costoso) */
    vision: { maxRequests: 10, windowMs: 60_000 },
    /** Generación: 5 por minuto (muy costoso) */
    generate: { maxRequests: 5, windowMs: 60_000 },
    /** General: 60 requests por minuto */
    general: { maxRequests: 60, windowMs: 60_000 },
} as const;
