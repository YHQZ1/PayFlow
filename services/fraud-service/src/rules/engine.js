import Redis from "ioredis";
import "dotenv/config";

const redis = new Redis(process.env.REDIS_URL);

const RULES = {
  VELOCITY: { score: 60, label: "high velocity" },
  LARGE_AMOUNT: { score: 40, label: "unusually large amount" },
  REPEATED_FAILURE: { score: 70, label: "repeated failures" },
};

const checkVelocity = async (tenantId) => {
  const key = `fraud:velocity:${tenantId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 60);
  return count > 5;
};

const checkLargeAmount = (amount) => {
  return amount > 10000000;
};

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

  if (await checkVelocity(tenantId)) {
    flags.push(RULES.VELOCITY);
    totalScore += RULES.VELOCITY.score;
  }

  if (checkLargeAmount(amount)) {
    flags.push(RULES.LARGE_AMOUNT);
    totalScore += RULES.LARGE_AMOUNT.score;
  }

  if (await checkRepeatedFailure(tenantId, status)) {
    flags.push(RULES.REPEATED_FAILURE);
    totalScore += RULES.REPEATED_FAILURE.score;
  }

  return {
    flagged: totalScore >= 50,
    score: totalScore,
    flags: flags.map((f) => f.label),
  };
};
