import * as stripe from "../providers/stripe.provider.js";
import { logger } from "../logger.js";

// Normalize Stripe charge → PayFlow charge shape
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

// Normalize Stripe refund → PayFlow refund shape
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
  return {
    status: "ok",
    service: "gateway-service",
    provider: "stripe",
    mode: "mock",
    timestamp: new Date().toISOString(),
    checks: { provider: "ok" },
  };
};

export const charge = async ({
  amount,
  currency,
  paymentId,
  tenantId,
  description,
}) => {
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

  logger.info(
    { providerRef: normalized.providerRef, status: normalized.status },
    "charge completed",
  );

  return normalized;
};

export const refund = async ({ providerRef, amount, reason }) => {
  logger.info({ providerRef, amount }, "initiating refund via stripe");

  const stripeRefund = await stripe.createRefund({
    providerRef,
    amount,
    reason,
  });
  const normalized = normalizeRefund(stripeRefund);

  logger.info(
    { providerRef: normalized.providerRef, status: normalized.status },
    "refund completed",
  );

  return normalized;
};

export const getCharge = async (providerRef) => {
  const stripeCharge = await stripe.fetchCharge(providerRef);
  return normalizeCharge(stripeCharge);
};

export const listAllCharges = () => {
  return stripe.listCharges().map(normalizeCharge);
};
