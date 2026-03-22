import { Kafka } from "kafkajs";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "fraud-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const producer = kafka.producer();

export const connectProducer = async () => {
  await producer.connect();
  logger.info("fraud-service producer connected");
};

export const publishFraudAlert = async ({
  tenantId,
  paymentId,
  score,
  flags,
}) => {
  await producer.send({
    topic: "fraud.flagged",
    messages: [
      {
        key: tenantId,
        value: JSON.stringify({
          eventType: "fraud.flagged",
          tenantId,
          payload: { paymentId, score, flags },
          metadata: {
            producedAt: new Date().toISOString(),
            producer: "fraud-service",
          },
        }),
      },
    ],
  });
  logger.warn({ paymentId, tenantId, score }, "fraud alert published");
};
