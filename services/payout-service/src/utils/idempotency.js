import { redis } from "../redis.js";
import { logger } from "../logger.js";

export const withIdempotency = async (key, handler, ttl = 86400) => {
  const result = await redis.set(key, "processing", "NX", "EX", 30);
  if (!result) {
    logger.warn({ key }, "duplicate message detected");
    return null;
  }
  try {
    const processed = await handler();
    await redis.set(key, "done", "EX", ttl);
    return processed;
  } catch (err) {
    await redis.del(key);
    throw err;
  }
};
