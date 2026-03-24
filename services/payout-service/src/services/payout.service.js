import { db } from "../db/index.js";
import { payouts } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "../logger.js";
import { ValidationError } from "../errors.js";
import "dotenv/config";

const MIN_PAYOUT_AMOUNT = parseInt(process.env.MIN_PAYOUT_AMOUNT) || 100;
const MAX_PAYOUT_AMOUNT = parseInt(process.env.MAX_PAYOUT_AMOUNT) || 10_000_000;

const checkTenantBalance = async (tenantId, amount) => {
  try {
    const response = await fetch(
      `${process.env.LEDGER_SERVICE_URL}/ledger/balances/${tenantId}`,
    );
    if (!response.ok) return false;
    const { amount: balance } = await response.json();
    return balance >= amount;
  } catch (err) {
    logger.error({ err, tenantId }, "failed to check tenant balance");
    return false;
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
    const res = await fetch(
      `${process.env.GATEWAY_SERVICE_URL}/gateway/health`,
    );
    checks.gateway = res.ok ? "ok" : "error";
    if (!res.ok) healthy = false;
  } catch {
    checks.gateway = "error";
    healthy = false;
  }

  try {
    const res = await fetch(`${process.env.LEDGER_SERVICE_URL}/ledger/health`);
    checks.ledger = res.ok ? "ok" : "error";
    if (!res.ok) healthy = false;
  } catch {
    checks.ledger = "error";
    healthy = false;
  }

  return {
    status: healthy ? "ok" : "degraded",
    service: "payout-service",
    timestamp: new Date().toISOString(),
    checks,
  };
};

const publishPayoutEvent = async (payout) => {
  try {
    const { kafka } = await import("../kafka/producer.js");
    await kafka.producer.send({
      topic: "payout.completed",
      messages: [
        {
          key: payout.tenantId,
          value: JSON.stringify({
            eventId: crypto.randomUUID(),
            eventType: "payout.completed",
            tenantId: payout.tenantId,
            payload: {
              payoutId: payout.id,
              amount: payout.amount,
              currency: payout.currency,
              status: payout.status,
              providerRef: payout.providerRef,
            },
            metadata: {
              producedAt: new Date().toISOString(),
              producer: "payout-service",
            },
          }),
        },
      ],
    });
    logger.info({ payoutId: payout.id }, "payout.completed event published");
  } catch (err) {
    logger.error(
      { err, payoutId: payout.id },
      "failed to publish payout event",
    );
  }
};

export const createPayout = async ({
  tenantId,
  amount,
  currency = "INR",
  description,
  metadata,
}) => {
  if (amount < MIN_PAYOUT_AMOUNT) {
    throw new ValidationError(`minimum payout amount is ${MIN_PAYOUT_AMOUNT}`);
  }
  if (amount > MAX_PAYOUT_AMOUNT) {
    throw new ValidationError(`maximum payout amount is ${MAX_PAYOUT_AMOUNT}`);
  }

  const hasBalance = await checkTenantBalance(tenantId, amount);
  if (!hasBalance) {
    throw new ValidationError("insufficient balance for payout");
  }

  return await db.transaction(async (tx) => {
    const [payout] = await tx
      .insert(payouts)
      .values({
        tenantId,
        amount,
        currency,
        description,
        metadata,
        status: "pending",
      })
      .returning();

    logger.info({ payoutId: payout.id, tenantId, amount }, "payout created");

    let gatewayResult;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${process.env.GATEWAY_SERVICE_URL}/gateway/charge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            currency,
            paymentId: payout.id,
            tenantId,
            description: description ?? "payout",
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) {
        gatewayResult = {
          status: "failed",
          providerRef: null,
          failureCode: data.providerCode ?? "gateway_error",
          failureMessage: data.error,
        };
      } else {
        gatewayResult = {
          status: data.status === "succeeded" ? "processed" : "failed",
          providerRef: data.providerRef,
          failureCode: data.failureCode ?? null,
          failureMessage: data.failureMessage ?? null,
        };
      }
    } catch (err) {
      logger.error({ err, payoutId: payout.id }, "gateway call failed");
      gatewayResult = {
        status: "failed",
        providerRef: null,
        failureCode: "network_error",
        failureMessage: "Gateway unreachable",
      };
    }

    const [updated] = await tx
      .update(payouts)
      .set({
        status: gatewayResult.status,
        providerRef: gatewayResult.providerRef,
        failureCode: gatewayResult.failureCode,
        failureMessage: gatewayResult.failureMessage,
        processedAt: gatewayResult.status === "processed" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payout.id))
      .returning();

    if (gatewayResult.status === "processed") {
      await publishPayoutEvent(updated);
    }

    return updated;
  });
};

export const getPayout = async (id) => {
  const [payout] = await db.select().from(payouts).where(eq(payouts.id, id));
  return payout || null;
};

export const listPayouts = async ({
  tenantId,
  status,
  limit = 20,
  offset = 0,
}) => {
  const conditions = [eq(payouts.tenantId, tenantId)];
  if (status) conditions.push(eq(payouts.status, status));

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(payouts)
      .where(and(...conditions))
      .orderBy(desc(payouts.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(payouts)
      .where(and(...conditions)),
  ]);

  return {
    data: rows,
    total: Number(total[0].count),
    limit,
    offset,
    hasMore: offset + limit < Number(total[0].count),
  };
};

export const processPendingPayouts = async ({
  tenantId,
  amount,
  currency,
  paymentId,
}) => {
  logger.info(
    { tenantId, amount, paymentId },
    "auto-creating payout from settled payment",
  );

  await createPayout({
    tenantId,
    amount,
    currency,
    description: `settlement for payment ${paymentId}`,
    metadata: { sourcePaymentId: paymentId, type: "auto_settlement" },
  });
};
