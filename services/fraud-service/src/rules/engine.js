import { redis } from "../services/fraud.service.js";
import { logger } from "../logger.js";

const RULES = {
  VELOCITY: { score: 60, label: "high_velocity" },
  LARGE_AMOUNT: { score: 40, label: "large_amount" },
  REPEATED_FAILURE: { score: 70, label: "repeated_failures" },
};

const checkVelocity = async (tenantId) => {
  const key = `fraud:velocity:${tenantId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 60);
  return count > 5;
};

const checkLargeAmount = (amount) => amount > 10_000_000;

const checkRepeatedFailure = async (tenantId, status) => {
  if (status !== "failed") return false;
  const key = `fraud:failures:${tenantId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 300);
  return count > 3;
};

export const runRules = async ({ tenantId, amount, status }) => {
  const flags = [];
  let totalScore = 0;

  const [velocityHit, failureHit] = await Promise.all([
    checkVelocity(tenantId),
    checkRepeatedFailure(tenantId, status),
  ]);

  if (velocityHit) {
    flags.push(RULES.VELOCITY.label);
    totalScore += RULES.VELOCITY.score;
  }
  if (checkLargeAmount(amount)) {
    flags.push(RULES.LARGE_AMOUNT.label);
    totalScore += RULES.LARGE_AMOUNT.score;
  }
  if (failureHit) {
    flags.push(RULES.REPEATED_FAILURE.label);
    totalScore += RULES.REPEATED_FAILURE.score;
  }

  logger.debug(
    { tenantId, amount, status, totalScore, flags },
    "fraud rules evaluated",
  );

  return { flagged: totalScore >= 50, score: totalScore, flags };
};
