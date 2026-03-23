import { db } from "../db/index.js";
import { payouts } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { logger } from "../logger.js";
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
    service: "payout-service",
    timestamp: new Date().toISOString(),
    checks,
  };
};

export const createPayout = async ({
  tenantId,
  amount,
  currency = "INR",
  description,
  metadata,
}) => {
  // Insert payout record as pending
  const [payout] = await db
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

  logger.info(
    { payoutId: payout.id, tenantId, amount },
    "payout created — dispatching to gateway",
  );

  // Call gateway-service to initiate the transfer
  let gatewayResult;
  try {
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
      },
    );

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

  const [updated] = await db
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

  logger.info(
    {
      payoutId: updated.id,
      status: updated.status,
      providerRef: updated.providerRef,
    },
    "payout processed",
  );

  return updated;
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

  const rows = await db
    .select()
    .from(payouts)
    .where(and(...conditions))
    .orderBy(desc(payouts.createdAt))
    .limit(limit)
    .offset(offset);

  return { data: rows, limit, offset };
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
