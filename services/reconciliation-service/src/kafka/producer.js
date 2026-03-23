import { Kafka } from "kafkajs";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "reconciliation-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const producer = kafka.producer();

export const connectProducer = async () => {
  await producer.connect();
  logger.info("reconciliation-service producer connected");
};

export const publishMismatch = async ({
  runId,
  tenantId,
  type,
  paymentId,
  ledgerAmount,
  gatewayAmount,
  description,
}) => {
  await producer.send({
    topic: "reconciliation.mismatch",
    messages: [
      {
        key: tenantId,
        value: JSON.stringify({
          eventType: "reconciliation.mismatch",
          tenantId,
          payload: {
            runId,
            type,
            paymentId,
            ledgerAmount,
            gatewayAmount,
            description,
          },
          metadata: {
            producedAt: new Date().toISOString(),
            producer: "reconciliation-service",
          },
        }),
      },
    ],
  });
  logger.warn({ runId, type, paymentId }, "mismatch event published");
};
