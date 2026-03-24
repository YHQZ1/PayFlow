import { Kafka } from "kafkajs";
import { logger } from "../logger.js";
import { checkForMismatch } from "../services/reconciliation.service.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "reconciliation-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || "reconciliation-service-cg",
});

export const startConsumer = async () => {
  await consumer.connect();

  await consumer.subscribe({
    topic: "ledger.updated",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        const { tenantId, paymentId, amount, newBalance } = event.payload;

        logger.debug(
          { tenantId, paymentId, amount, newBalance },
          "ledger update received for reconciliation",
        );

        // Real-time mismatch detection
        await checkForMismatch({ tenantId, paymentId, amount });
      } catch (err) {
        logger.error({ err }, "failed to process ledger update");
      }
    },
  });

  logger.info(
    "reconciliation-service consumer started (listening for ledger.updated)",
  );
};

const shutdown = async () => {
  await consumer.disconnect();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
