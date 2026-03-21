import { db } from "../db/index.js";
import { payments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { publishEvent } from "../kafka/producer.js";

const mockPaymentProvider = () => {
  return Math.random() > 0.1 ? "succeeded" : "failed";
};

export const createPayment = async ({
  tenantId,
  amount,
  currency,
  description,
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
      status: "pending",
    })
    .returning();

  const providerStatus = mockPaymentProvider();
  const providerRef = `mock_${uuidv4()}`;

  const [updated] = await db
    .update(payments)
    .set({ status: providerStatus, providerRef, updatedAt: new Date() })
    .where(eq(payments.id, payment.id))
    .returning();

  await publishEvent("payment.created", {
    eventId: uuidv4(),
    eventType: "payment.created",
    tenantId,
    payload: {
      paymentId: updated.id,
      amount,
      currency,
      status: providerStatus,
    },
    metadata: {
      producedAt: new Date().toISOString(),
      producer: "payment-service",
    },
  });

  return updated;
};

export const getPayment = async (id, tenantId) => {
  const [payment] = await db.select().from(payments).where(eq(payments.id, id));

  if (!payment || payment.tenantId !== tenantId) return null;
  return payment;
};

export const listPayments = async (tenantId) => {
  return db.select().from(payments).where(eq(payments.tenantId, tenantId));
};
