import { v4 as uuidv4 } from "uuid";
import { GatewayError } from "../errors.js";

const STRIPE_DECLINE_CODES = [
  "card_declined",
  "insufficient_funds",
  "lost_card",
  "expired_card",
];

const SUCCESS_RATE = parseFloat(process.env.MOCK_SUCCESS_RATE ?? "0.9");

const chargeStore = new Map();

const withRetry = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 100));
    }
  }
};

export const createCharge = async (params) => {
  return withRetry(async () => {
    await new Promise((r) => setTimeout(r, Math.random() * 80 + 20));

    const {
      amount,
      currency = "INR",
      paymentId,
      tenantId,
      description,
    } = params;
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
  });
};

export const createRefund = async ({
  providerRef,
  amount,
  reason = "requested_by_customer",
}) => {
  return withRetry(async () => {
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

    chargeStore.set(providerRef, {
      ...originalCharge,
      refunded: true,
      amount_refunded: amount,
    });

    return refund;
  });
};

export const fetchCharge = async (providerRef) => {
  return withRetry(async () => {
    await new Promise((r) => setTimeout(r, Math.random() * 40 + 10));

    const charge = chargeStore.get(providerRef);
    if (!charge) {
      throw new GatewayError(
        `No charge found with id ${providerRef}`,
        "charge_not_found",
      );
    }
    return charge;
  });
};

export const listCharges = () => {
  return Array.from(chargeStore.values());
};
