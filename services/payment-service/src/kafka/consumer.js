import { Kafka } from "kafkajs";
import { logger } from "../logger.js";
import { db } from "../db/index.js";
import { payments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "payment-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || "payment-service-cg",
});

export const startConsumer = async () => {
  await consumer.connect();

  await consumer.subscribe({
    topic: "fraud.flagged",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        const { paymentId, score, flags } = event.payload;

        logger.warn(
          { paymentId, score, flags },
          "received fraud alert for payment",
        );

        // Block payment if fraud score is critical (>=100)
        if (score >= 100) {
          await db
            .update(payments)
            .set({
              status: "blocked",
              metadata: {
                fraudScore: score,
                fraudFlags: flags,
                blockedAt: new Date().toISOString(),
              },
            })
            .where(eq(payments.id, paymentId));

          logger.error({ paymentId, score }, "payment blocked due to fraud");
        }
      } catch (err) {
        logger.error({ err }, "failed to process fraud alert");
      }
    },
  });

  logger.info("payment-service consumer started (listening for fraud.flagged)");
};

const shutdown = async () => {
  await consumer.disconnect();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
