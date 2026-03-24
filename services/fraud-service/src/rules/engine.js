import { redis } from "../redis.js";
import { logger } from "../logger.js";
import "dotenv/config";

const VELOCITY_THRESHOLD = parseInt(process.env.FRAUD_VELOCITY_THRESHOLD) || 5;
const VELOCITY_WINDOW_SEC =
  parseInt(process.env.FRAUD_VELOCITY_WINDOW_SEC) || 60;
const LARGE_AMOUNT_THRESHOLD =
  parseInt(process.env.FRAUD_LARGE_AMOUNT_THRESHOLD) || 10_000_000;
const FAILURE_THRESHOLD = parseInt(process.env.FRAUD_FAILURE_THRESHOLD) || 3;
const FLAG_THRESHOLD = parseInt(process.env.FRAUD_FLAG_THRESHOLD) || 50;

const RULES = {
  VELOCITY: { score: 60, label: "high_velocity" },
  LARGE_AMOUNT: { score: 40, label: "large_amount" },
  REPEATED_FAILURE: { score: 70, label: "repeated_failures" },
};

const checkVelocity = async (tenantId) => {
  const key = `fraud:velocity:${tenantId}`;
  const script = `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    return count
  `;
  const count = await redis.eval(script, 1, key, VELOCITY_WINDOW_SEC);
  return count > VELOCITY_THRESHOLD;
};

const checkLargeAmount = (amount) => amount > LARGE_AMOUNT_THRESHOLD;

const checkRepeatedFailure = async (tenantId, status) => {
  if (status !== "failed") return false;
  const key = `fraud:failures:${tenantId}`;
  const script = `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then
      redis.call('EXPIRE', KEYS[1], 300)
    end
    return count
  `;
  const count = await redis.eval(script, 1, key);
  return count > FAILURE_THRESHOLD;
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

  return { flagged: totalScore >= FLAG_THRESHOLD, score: totalScore, flags };
};
