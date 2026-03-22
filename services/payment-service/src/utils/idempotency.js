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
