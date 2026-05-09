import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, MemoryStore } from '../rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ store: new MemoryStore() });
  });

  it('allows requests within limit', async () => {
    const result = await limiter.check('test-ip', { maxRequests: 5, windowMs: 60000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks requests over limit', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.check('test-ip', { maxRequests: 5, windowMs: 60000 });
    }
    const result = await limiter.check('test-ip', { maxRequests: 5, windowMs: 60000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
