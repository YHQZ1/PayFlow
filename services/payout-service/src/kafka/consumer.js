import { Kafka } from "kafkajs";
import { processPendingPayouts } from "../services/payout.service.js";
import { withIdempotency } from "../utils/idempotency.js";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "payout-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID,
  allowAutoTopicCreation: true,
});

export const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment.created", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        const { tenantId } = event;
        const { paymentId, amount, currency, status } = event.payload;

        if (status !== "succeeded") {
          logger.info(
            { paymentId, status },
            "skipping payout — payment not succeeded",
          );
          return;
        }

        await withIdempotency(`payout:payment:${paymentId}`, async () => {
          await processPendingPayouts({
            tenantId,
            amount,
            currency,
            paymentId,
          });
        });
      } catch (err) {
        logger.error({ err }, "failed to process payout message");
      }
    },
  });

  logger.info("payout-service consumer started");
};

const shutdown = async () => {
  logger.info("shutting down payout-service consumer");
  await consumer.disconnect();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
