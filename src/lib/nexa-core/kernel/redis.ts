import { Redis } from '@upstash/redis'

let redisInstance: Redis | null = null;

const initRedis = () => {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || '',
    });
  }
  return redisInstance;
}

export const redis = new Proxy({} as Redis, {
  get(target, prop, receiver) {
    const instance = initRedis();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});
