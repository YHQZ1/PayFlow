import Redis from "ioredis";
import "dotenv/config";

const redis = new Redis(process.env.REDIS_URL);
const TTL = 60 * 60 * 24;

export const checkIdempotency = async (key) => {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
};

export const saveIdempotency = async (key, response) => {
  await redis.set(key, JSON.stringify(response), "EX", TTL);
};

export const withIdempotency = async (key, handler, ttl = TTL) => {
  const lockKey = `idempotency:lock:${key}`;
  const locked = await redis.set(lockKey, "processing", "NX", "EX", 30);

  if (!locked) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const cached = await redis.get(key);
      if (cached) {
        return { ...JSON.parse(cached), idempotent: true };
      }
    }
    throw new Error("idempotency key conflict - please retry");
  }

  try {
    const result = await handler();
    await redis.set(key, JSON.stringify(result), "EX", ttl);
    return { ...result, idempotent: false };
  } finally {
    await redis.del(lockKey);
  }
};
