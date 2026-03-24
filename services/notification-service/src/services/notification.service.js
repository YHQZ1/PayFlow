import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { redis } from "../redis.js";
import "dotenv/config";

export const checkHealth = async () => {
  const checks = {};
  let healthy = true;

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
    healthy = false;
  }

  try {
    const res = await fetch(
      `${process.env.GATEWAY_SERVICE_URL}/gateway/health`,
    );
    checks.gateway = res.ok ? "ok" : "error";
    if (!res.ok) healthy = false;
  } catch {
    checks.gateway = "error";
    healthy = false;
  }

  return {
    status: healthy ? "ok" : "degraded",
    service: "notification-service",
    timestamp: new Date().toISOString(),
    checks,
  };
};
