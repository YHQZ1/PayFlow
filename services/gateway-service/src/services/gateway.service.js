import * as stripe from "../providers/stripe.provider.js";
import { db } from "../db/index.js";
import { charges, refunds } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "../logger.js";

const normalizeCharge = (stripeCharge) => ({
  providerRef: stripeCharge.id,
  provider: "stripe",
  status: stripeCharge.status,
  amount: stripeCharge.amount,
  currency: stripeCharge.currency.toUpperCase(),
  paid: stripeCharge.paid ?? false,
  failureCode: stripeCharge.failure_code ?? null,
  failureMessage: stripeCharge.failure_message ?? null,
  balanceTransaction: stripeCharge.balance_transaction ?? null,
  metadata: stripeCharge.metadata ?? {},
  createdAt: new Date(stripeCharge.created * 1000).toISOString(),
});

const normalizeRefund = (stripeRefund) => ({
  providerRef: stripeRefund.id,
  chargeRef: stripeRefund.charge,
  provider: "stripe",
  status: stripeRefund.status,
  amount: stripeRefund.amount,
  currency: stripeRefund.currency.toUpperCase(),
  reason: stripeRefund.reason,
  createdAt: new Date(stripeRefund.created * 1000).toISOString(),
});

export const checkHealth = async () => {
  let database = "ok";
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    database = "error";
  }

  return {
    status: database === "ok" ? "ok" : "degraded",
    service: "gateway-service",
    provider: "stripe",
    mode: "mock",
    timestamp: new Date().toISOString(),
    checks: { provider: "ok", database },
  };
};

export const charge = async ({
  amount,
  currency = "INR",
  paymentId,
  tenantId,
  description,
  idempotencyKey,
}) => {
  const existing = await db
    .select()
    .from(charges)
    .where(eq(charges.idempotencyKey, idempotencyKey));

  if (existing.length) {
    logger.info(
      { idempotencyKey, providerRef: existing[0].providerRef },
      "idempotent charge returned",
    );
    return existing[0];
  }

  logger.info(
    { paymentId, tenantId, amount, currency },
    "initiating charge via stripe",
  );

  const stripeCharge = await stripe.createCharge({
    amount,
    currency,
    paymentId,
    tenantId,
    description,
  });

  const normalized = normalizeCharge(stripeCharge);

  await db.insert(charges).values({
    providerRef: normalized.providerRef,
    idempotencyKey,
    paymentId,
    tenantId,
    amount,
    currency: currency.toUpperCase(),
    status: normalized.status,
    paid: normalized.paid,
    failureCode: normalized.failureCode,
    failureMessage: normalized.failureMessage,
    balanceTransaction: normalized.balanceTransaction,
    metadata: { paymentId, tenantId },
    description,
  });

  logger.info(
    { providerRef: normalized.providerRef, status: normalized.status },
    "charge completed",
  );

  return normalized;
};

export const refund = async ({
  providerRef,
  amount,
  reason,
  idempotencyKey,
}) => {
  const existing = await db
    .select()
    .from(refunds)
    .where(eq(refunds.idempotencyKey, idempotencyKey));

  if (existing.length) {
    logger.info(
      { idempotencyKey, providerRef: existing[0].providerRef },
      "idempotent refund returned",
    );
    return existing[0];
  }

  logger.info({ providerRef, amount }, "initiating refund via stripe");

  const stripeRefund = await stripe.createRefund({
    providerRef,
    amount,
    reason,
  });

  const normalized = normalizeRefund(stripeRefund);

  const [charge] = await db
    .select()
    .from(charges)
    .where(eq(charges.providerRef, providerRef));

  await db.insert(refunds).values({
    providerRef: normalized.providerRef,
    idempotencyKey,
    chargeRef: providerRef,
    tenantId: charge?.tenantId,
    amount,
    currency: normalized.currency,
    status: normalized.status,
    reason,
  });

  logger.info(
    { providerRef: normalized.providerRef, status: normalized.status },
    "refund completed",
  );

  return normalized;
};

export const getCharge = async (providerRef) => {
  const [charge] = await db
    .select()
    .from(charges)
    .where(eq(charges.providerRef, providerRef));
  if (!charge) throw new NotFoundError("charge");
  return charge;
};

export const listCharges = async ({ limit = 20, offset = 0 }) => {
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(charges)
      .orderBy(desc(charges.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql`count(*)` }).from(charges),
  ]);

  return {
    data: rows,
    total: Number(total[0].count),
    limit,
    offset,
    hasMore: offset + limit < Number(total[0].count),
  };
};
