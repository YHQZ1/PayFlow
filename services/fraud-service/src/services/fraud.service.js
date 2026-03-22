import Redis from "ioredis";
import "dotenv/config";

export const redis = new Redis(process.env.REDIS_URL);

export const checkHealth = async () => {
  try {
    await redis.ping();
    return {
      status: "ok",
      service: "fraud-service",
      timestamp: new Date().toISOString(),
      checks: { redis: "ok" },
    };
  } catch {
    return {
      status: "degraded",
      service: "fraud-service",
      timestamp: new Date().toISOString(),
      checks: { redis: "error" },
    };
  }
};

export const getRiskScore = async (tenantId) => {
  const [velocity, failures] = await Promise.all([
    redis.get(`fraud:velocity:${tenantId}`),
    redis.get(`fraud:failures:${tenantId}`),
  ]);

  const velocityCount = parseInt(velocity) || 0;
  const failureCount = parseInt(failures) || 0;
  const score = (velocityCount > 5 ? 60 : 0) + (failureCount > 3 ? 70 : 0);

  return {
    tenantId,
    score,
    risk:
      score >= 100
        ? "critical"
        : score >= 60
          ? "high"
          : score >= 40
            ? "medium"
            : "low",
    counters: { velocity: velocityCount, failures: failureCount },
    timestamp: new Date().toISOString(),
  };
};

export const resetRiskCounters = async (tenantId) => {
  await Promise.all([
    redis.del(`fraud:velocity:${tenantId}`),
    redis.del(`fraud:failures:${tenantId}`),
  ]);
};
