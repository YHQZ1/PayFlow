import { Kafka } from "kafkajs";
import { randomUUID } from "crypto";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "ledger-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const producer = kafka.producer();

export const connectProducer = async () => {
  await producer.connect();
  logger.info("ledger-service producer connected");
};

export const publishLedgerUpdated = async ({
  paymentId,
  tenantId,
  amount,
  currency,
  newBalance,
}) => {
  await producer.send({
    topic: "ledger.updated",
    messages: [
      {
        key: tenantId,
        value: JSON.stringify({
          eventId: randomUUID(),
          eventType: "ledger.updated",
          tenantId,
          payload: {
            paymentId,
            amount,
            currency,
            newBalance,
          },
          metadata: {
            producedAt: new Date().toISOString(),
            producer: "ledger-service",
          },
        }),
      },
    ],
  });
  logger.info(
    { paymentId, tenantId, newBalance },
    "ledger.updated event published",
  );
};

const shutdown = async () => {
  await producer.disconnect();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
