import { db } from "../db/index.js";
import { payments } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { publishEvent } from "../kafka/producer.js";
import { logger } from "../logger.js";
import Redis from "ioredis";
import "dotenv/config";

const redis = new Redis(process.env.REDIS_URL);

const chargeViaGateway = async ({
  amount,
  currency,
  paymentId,
  tenantId,
  description,
}) => {
  const response = await fetch(
    `${process.env.GATEWAY_SERVICE_URL}/gateway/charge`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        currency,
        paymentId,
        tenantId,
        description,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return {
      status: "failed",
      providerRef: null,
      failureCode: data.providerCode ?? "gateway_error",
      failureMessage: data.error ?? "gateway request failed",
    };
  }

  return {
    status: data.status,
    providerRef: data.providerRef,
    failureCode: data.failureCode ?? null,
    failureMessage: data.failureMessage ?? null,
  };
};

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
    service: "payment-service",
    timestamp: new Date().toISOString(),
    checks,
  };
};

export const createPayment = async ({
  tenantId,
  amount,
  currency,
  description,
  metadata,
  idempotencyKey,
}) => {
  const [payment] = await db
    .insert(payments)
    .values({
      tenantId,
      idempotencyKey,
      amount,
      currency,
      description,
      metadata,
      status: "pending",
    })
    .returning();

  const gatewayResult = await chargeViaGateway({
    amount,
    currency,
    paymentId: payment.id,
    tenantId,
    description,
  });

  const [updated] = await db
    .update(payments)
    .set({
      status: gatewayResult.status,
      providerRef: gatewayResult.providerRef,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id))
    .returning();

  const topic =
    gatewayResult.status === "succeeded" ? "payment.created" : "payment.failed";

  await publishEvent(topic, {
    eventId: uuidv4(),
    eventType: topic,
    tenantId,
    payload: {
      paymentId: updated.id,
      amount,
      currency,
      status: gatewayResult.status,
      providerRef: gatewayResult.providerRef,
      failureCode: gatewayResult.failureCode,
    },
    metadata: {
      producedAt: new Date().toISOString(),
      producer: "payment-service",
    },
  });

  logger.info(
    { paymentId: updated.id, tenantId, amount, status: gatewayResult.status },
    "payment processed via gateway",
  );

  return updated;
};

export const getPayment = async (id, tenantId) => {
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, id), eq(payments.tenantId, tenantId)));
  return payment || null;
};

export const listPayments = async ({
  tenantId,
  status,
  limit = 20,
  offset = 0,
}) => {
  const conditions = [eq(payments.tenantId, tenantId)];
  if (status) conditions.push(eq(payments.status, status));

  const rows = await db
    .select()
    .from(payments)
    .where(and(...conditions))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .offset(offset);

  return { data: rows, limit, offset };
};
