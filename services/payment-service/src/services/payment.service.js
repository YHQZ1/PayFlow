import { db } from "../db/index.js";
import { payments, outbox, refunds } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../logger.js";
import { redis } from "../redis.js";

import "dotenv/config";

const chargeViaGateway = async (params, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${process.env.GATEWAY_SERVICE_URL}/gateway/charge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);
      const data = await response.json();

      if (response.ok) {
        return {
          status: data.status,
          providerRef: data.providerRef,
          failureCode: null,
          failureMessage: null,
        };
      }

      if (response.status >= 400 && response.status < 500) {
        return {
          status: "failed",
          providerRef: null,
          failureCode: data.providerCode || "declined",
          failureMessage: data.error || "payment declined",
        };
      }

      if (i === retries - 1) {
        return {
          status: "failed",
          providerRef: null,
          failureCode: "gateway_error",
          failureMessage: data.error || "gateway error after retries",
        };
      }
    } catch (err) {
      if (err.name === "AbortError") {
        logger.error({ paymentId: params.paymentId }, "gateway timeout");
      }
      if (i === retries - 1) {
        return {
          status: "failed",
          providerRef: null,
          failureCode: "gateway_unreachable",
          failureMessage: "payment gateway is temporarily unavailable",
        };
      }
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 100));
    }
  }
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

  const event = {
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
  };

  await db.insert(outbox).values({
    topic,
    payload: event,
  });

  logger.info(
    {
      paymentId: updated.id,
      tenantId,
      amount,
      status: gatewayResult.status,
    },
    "payment processed",
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

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(payments)
      .where(and(...conditions))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(payments)
      .where(and(...conditions)),
  ]);

  const totalCount = Number(total[0].count);

  return {
    data: rows,
    total: totalCount,
    limit,
    offset,
    hasMore: offset + limit < totalCount,
  };
};

export const refundPayment = async ({
  paymentId,
  tenantId,
  idempotencyKey,
  amount,
  reason,
}) => {
  // Get the original payment
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)));

  if (!payment) {
    throw new ValidationError("Payment not found");
  }

  if (payment.status !== "succeeded") {
    throw new ValidationError(
      `Cannot refund payment with status: ${payment.status}`,
    );
  }

  // Check if already refunded
  const [existingRefund] = await db
    .select()
    .from(refunds)
    .where(eq(refunds.paymentId, paymentId));

  if (existingRefund) {
    throw new ValidationError("Payment already refunded");
  }

  const refundAmount = amount || payment.amount;

  if (refundAmount > payment.amount) {
    throw new ValidationError(
      "Refund amount cannot exceed original payment amount",
    );
  }

  // Call gateway to process refund
  let gatewayResult;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${process.env.GATEWAY_SERVICE_URL}/gateway/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          providerRef: payment.providerRef,
          amount: refundAmount,
          reason: reason || "requested_by_customer",
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Refund failed");
    }

    gatewayResult = {
      status: "succeeded",
      providerRef: data.providerRef,
    };
  } catch (err) {
    logger.error({ err, paymentId }, "gateway refund failed");
    throw new ValidationError(`Refund failed: ${err.message}`);
  }

  // Create refund record
  const [refund] = await db
    .insert(refunds)
    .values({
      paymentId,
      tenantId,
      amount: refundAmount,
      currency: payment.currency,
      status: gatewayResult.status,
      providerRef: gatewayResult.providerRef,
      reason: reason || null,
      idempotencyKey,
    })
    .returning();

  // Update payment status if fully refunded
  if (refundAmount === payment.amount) {
    await db
      .update(payments)
      .set({
        status: "refunded",
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));
  }

  // Emit refund event to Kafka via outbox
  const event = {
    eventId: uuidv4(),
    eventType: "payment.refunded",
    tenantId,
    payload: {
      paymentId,
      refundId: refund.id,
      amount: refundAmount,
      currency: payment.currency,
      reason: reason || null,
      status: gatewayResult.status,
    },
    metadata: {
      producedAt: new Date().toISOString(),
      producer: "payment-service",
    },
  };

  await db.insert(outbox).values({
    topic: "payment.refunded",
    payload: event,
  });

  logger.info(
    {
      paymentId,
      refundId: refund.id,
      tenantId,
      amount: refundAmount,
    },
    "refund processed",
  );

  return refund;
};
