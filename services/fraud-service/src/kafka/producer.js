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

export const publishToDLQ = async (originalTopic, message) => {
  await producer.send({
    topic: `${originalTopic}.dlq`,
    messages: [
      {
        value: JSON.stringify({
          originalTopic,
          originalMessage: message.value?.toString(),
          error: "processing_failed",
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });
  logger.error({ originalTopic }, "message sent to dead-letter queue");
};

const shutdown = async () => {
  logger.info("shutting down fraud-service producer");
  await producer.disconnect();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
