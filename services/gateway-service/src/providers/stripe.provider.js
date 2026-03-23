import { v4 as uuidv4 } from "uuid";
import { GatewayError } from "../errors.js";

// Stripe-shaped error codes
const STRIPE_DECLINE_CODES = [
  "card_declined",
  "insufficient_funds",
  "lost_card",
  "expired_card",
];

const SUCCESS_RATE = parseFloat(process.env.MOCK_SUCCESS_RATE ?? "0.9");

// In-memory store simulates Stripe's charge records
const chargeStore = new Map();

export const createCharge = async ({
  amount,
  currency = "INR",
  paymentId,
  tenantId,
  description,
}) => {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, Math.random() * 80 + 20));

  const providerRef = `ch_${uuidv4().replace(/-/g, "").slice(0, 24)}`;
  const succeeded = Math.random() < SUCCESS_RATE;

  if (!succeeded) {
    const declineCode =
      STRIPE_DECLINE_CODES[
        Math.floor(Math.random() * STRIPE_DECLINE_CODES.length)
      ];
    const charge = {
      id: providerRef,
      object: "charge",
      amount,
      currency: currency.toLowerCase(),
      status: "failed",
      failure_code: declineCode,
      failure_message: `Your card was declined. Decline code: ${declineCode}`,
      metadata: { paymentId, tenantId },
      description,
      created: Math.floor(Date.now() / 1000),
    };
    chargeStore.set(providerRef, charge);
    throw new GatewayError(`Payment declined — ${declineCode}`, declineCode);
  }

  const charge = {
    id: providerRef,
    object: "charge",
    amount,
    currency: currency.toLowerCase(),
    status: "succeeded",
    paid: true,
    failure_code: null,
    failure_message: null,
    balance_transaction: `txn_${uuidv4().replace(/-/g, "").slice(0, 24)}`,
    metadata: { paymentId, tenantId },
    description,
    created: Math.floor(Date.now() / 1000),
  };

  chargeStore.set(providerRef, charge);
  return charge;
};

export const createRefund = async ({
  providerRef,
  amount,
  reason = "requested_by_customer",
}) => {
  await new Promise((r) => setTimeout(r, Math.random() * 60 + 20));

  const originalCharge = chargeStore.get(providerRef);
  if (!originalCharge) {
    throw new GatewayError(
      `No charge found with id ${providerRef}`,
      "charge_not_found",
    );
  }

  if (originalCharge.status !== "succeeded") {
    throw new GatewayError(
      "Cannot refund a failed charge",
      "charge_not_refundable",
    );
  }

  const refund = {
    id: `re_${uuidv4().replace(/-/g, "").slice(0, 24)}`,
    object: "refund",
    amount,
    currency: originalCharge.currency,
    charge: providerRef,
    status: "succeeded",
    reason,
    created: Math.floor(Date.now() / 1000),
  };

  // Mark original charge as refunded
  chargeStore.set(providerRef, {
    ...originalCharge,
    refunded: true,
    amount_refunded: amount,
  });

  return refund;
};

export const fetchCharge = async (providerRef) => {
  await new Promise((r) => setTimeout(r, Math.random() * 40 + 10));

  const charge = chargeStore.get(providerRef);
  if (!charge) {
    throw new GatewayError(
      `No charge found with id ${providerRef}`,
      "charge_not_found",
    );
  }

  return charge;
};

export const listCharges = () => {
  return Array.from(chargeStore.values());
};
