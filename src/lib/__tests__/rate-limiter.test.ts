import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, MemoryStore, createRateLimiter, getIdentifier, RATE_LIMITS } from '../rate-limiter';

describe('MemoryStore', () => {
    let store: MemoryStore;

    beforeEach(() => {
        store = new MemoryStore();
    });

    it('debe retornar null para key inexistente', async () => {
        const result = await store.get('nonexistent');
        expect(result).toBeNull();
    });

    it('debe guardar y recuperar un valor', async () => {
        await store.set('test-key', { count: 5, resetAt: Date.now() + 60000 }, 60000);
        const result = await store.get('test-key');
        expect(result).not.toBeNull();
        expect(result!.count).toBe(5);
    });

    it('debe retornar null para entradas expiradas', async () => {
        await store.set('expired', { count: 1, resetAt: Date.now() - 1000 }, 1000);
        const result = await store.get('expired');
        expect(result).toBeNull();
    });

    it('debe incrementar el contador', async () => {
        await store.set('counter', { count: 3, resetAt: Date.now() + 60000 }, 60000);
        const newCount = await store.increment('counter');
        expect(newCount).toBe(4);
    });

    it('debe retornar 0 al incrementar key inexistente', async () => {
        const result = await store.increment('missing');
        expect(result).toBe(0);
    });

    it('cleanup debe eliminar entradas expiradas', async () => {
        await store.set('expired1', { count: 1, resetAt: Date.now() - 1000 }, 1000);
        await store.set('expired2', { count: 2, resetAt: Date.now() - 5000 }, 5000);
        await store.set('valid', { count: 3, resetAt: Date.now() + 60000 }, 60000);

        await store.cleanup();

        expect(await store.get('expired1')).toBeNull();
        expect(await store.get('expired2')).toBeNull();
        expect((await store.get('valid'))!.count).toBe(3);
    });
});

describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = createRateLimiter();
    });

    it('debe permitir la primera solicitud', async () => {
        const result = await limiter.check('user-1', { maxRequests: 5, windowMs: 60000 });
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
    });

    it('debe bloquear después de exceder el límite', async () => {
        const config = { maxRequests: 3, windowMs: 60000 };
        await limiter.check('user-2', config);
        await limiter.check('user-2', config);
        await limiter.check('user-2', config);
        const result = await limiter.check('user-2', config);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('debe aislar límites por identificador', async () => {
        const config = { maxRequests: 2, windowMs: 60000 };
        await limiter.check('user-a', config);
        await limiter.check('user-a', config);
        const blockedA = await limiter.check('user-a', config);
        expect(blockedA.allowed).toBe(false);

        const allowedB = await limiter.check('user-b', config);
        expect(allowedB.allowed).toBe(true);
    });

    it('debe usar presets correctamente', async () => {
        const result = await limiter.checkPreset('user-3', 'chat');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(RATE_LIMITS.chat.maxRequests - 1);
    });

    it('debe lanzar error para preset inexistente', async () => {
        await expect(limiter.checkPreset('user-4', 'nonexistent')).rejects.toThrow('Unknown rate limit preset: nonexistent');
    });

    it('debe retornar preset por nombre', () => {
        const config = limiter.getPreset('vision');
        expect(config).toBeDefined();
        expect(config!.maxRequests).toBe(10);
    });

    it('debe decrementar remaining con cada solicitud', async () => {
        const config = { maxRequests: 5, windowMs: 60000 };
        const r1 = await limiter.check('user-dec', config);
        expect(r1.remaining).toBe(4);
        const r2 = await limiter.check('user-dec', config);
        expect(r2.remaining).toBe(3);
        const r3 = await limiter.check('user-dec', config);
        expect(r3.remaining).toBe(2);
    });

    it('debe resetear después de que la ventana expira', async () => {
        const config = { maxRequests: 2, windowMs: 50 }; // 50ms window
        await limiter.check('user-reset', config);
        await limiter.check('user-reset', config);
        const blocked = await limiter.check('user-reset', config);
        expect(blocked.allowed).toBe(false);

        // Wait for window to expire
        await new Promise(resolve => setTimeout(resolve, 60));

        const allowed = await limiter.check('user-reset', config);
        expect(allowed.allowed).toBe(true);
        expect(allowed.remaining).toBe(1);
    });
});

describe('getIdentifier', () => {
    it('debe extraer IP de x-forwarded-for', () => {
        const request = new Request('http://localhost', {
            headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
        });
        expect(getIdentifier(request)).toBe('192.168.1.1');
    });

    it('debe extraer IP de x-real-ip', () => {
        const request = new Request('http://localhost', {
            headers: { 'x-real-ip': '10.0.0.5' }
        });
        expect(getIdentifier(request)).toBe('10.0.0.5');
    });

    it('debe retornar "unknown" si no hay headers', () => {
        const request = new Request('http://localhost');
        expect(getIdentifier(request)).toBe('unknown');
    });

    it('debe priorizar x-forwarded-for sobre x-real-ip', () => {
        const request = new Request('http://localhost', {
            headers: {
                'x-forwarded-for': '1.2.3.4',
                'x-real-ip': '5.6.7.8'
            }
        });
        expect(getIdentifier(request)).toBe('1.2.3.4');
    });
});

describe('RATE_LIMITS', () => {
    it('debe tener preset para chat', () => {
        expect(RATE_LIMITS.chat).toBeDefined();
        expect(RATE_LIMITS.chat.maxRequests).toBe(30);
        expect(RATE_LIMITS.chat.windowMs).toBe(60000);
    });

    it('debe tener preset para vision (más restrictivo)', () => {
        expect(RATE_LIMITS.vision).toBeDefined();
        expect(RATE_LIMITS.vision.maxRequests).toBeLessThan(RATE_LIMITS.chat.maxRequests);
    });

    it('debe tener preset para generate (más restrictivo que vision)', () => {
        expect(RATE_LIMITS.generate).toBeDefined();
        expect(RATE_LIMITS.generate.maxRequests).toBeLessThanOrEqual(RATE_LIMITS.vision.maxRequests);
    });

    it('debe tener preset para general (más permisivo)', () => {
        expect(RATE_LIMITS.general).toBeDefined();
        expect(RATE_LIMITS.general.maxRequests).toBeGreaterThan(RATE_LIMITS.chat.maxRequests);
    });
});

describe('createRateLimiter', () => {
    it('debe crear limiter con defaults', () => {
        const limiter = createRateLimiter();
        expect(limiter).toBeInstanceOf(RateLimiter);
    });

    it('debe crear limiter con store personalizado', () => {
        const customStore = new MemoryStore();
        const limiter = createRateLimiter({ store: customStore });
        expect(limiter).toBeInstanceOf(RateLimiter);
    });

    it('debe crear limiter con presets personalizados', () => {
        const limiter = createRateLimiter({
            presets: { custom: { maxRequests: 100, windowMs: 30000 } }
        });
        const config = limiter.getPreset('custom');
        expect(config).toBeDefined();
        expect(config!.maxRequests).toBe(100);
    });

    it('debe mergear presets custom con defaults', () => {
        const limiter = createRateLimiter({
            presets: { custom: { maxRequests: 100, windowMs: 30000 } }
        });
        // Default presets should still exist
        expect(limiter.getPreset('chat')).toBeDefined();
        expect(limiter.getPreset('custom')).toBeDefined();
    });
});
