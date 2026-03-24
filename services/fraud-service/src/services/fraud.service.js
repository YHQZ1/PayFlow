import { redis } from "../redis.js";
import "dotenv/config";

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

  const velocityThreshold = parseInt(process.env.FRAUD_VELOCITY_THRESHOLD) || 5;
  const failureThreshold = parseInt(process.env.FRAUD_FAILURE_THRESHOLD) || 3;

  const score =
    (velocityCount > velocityThreshold ? 60 : 0) +
    (failureCount > failureThreshold ? 70 : 0);

  const riskLevel =
    score >= 100
      ? "critical"
      : score >= 60
        ? "high"
        : score >= 40
          ? "medium"
          : "low";

  return {
    tenantId,
    score,
    risk: riskLevel,
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

const shutdown = async () => {
  await redis.quit();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
