// Re-export shared types
export type { RateLimitResult } from '../../../../lib/shared-types';
import type { RateLimitResult } from '../../../../lib/shared-types';

export interface RateLimitAlgorithm {
    name: string;
    check(key: string, limits: Record<string, unknown>): Promise<RateLimitResult>;
}

export class TokenBucket implements RateLimitAlgorithm {
    name = 'token_bucket';
    async check(_key: string, _limits: Record<string, unknown>): Promise<RateLimitResult> {
        return { allowed: true, remaining: 10, resetAt: Date.now() + 60000, reset: Date.now() + 60000, limit: 100, retryAfter: 0 };
    }
}

export class SlidingWindow implements RateLimitAlgorithm {
    name = 'sliding_window';
    async check(_key: string, _limits: Record<string, unknown>): Promise<RateLimitResult> {
        return { allowed: true, remaining: 10, resetAt: Date.now() + 60000, reset: Date.now() + 60000, limit: 100, retryAfter: 0 };
    }
}

export class FixedWindow implements RateLimitAlgorithm {
    name = 'fixed_window';
    async check(_key: string, _limits: Record<string, unknown>): Promise<RateLimitResult> {
        return { allowed: true, remaining: 10, resetAt: Date.now() + 60000, reset: Date.now() + 60000, limit: 100, retryAfter: 0 };
    }
}
