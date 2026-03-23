import { Kafka } from "kafkajs";
import { processPendingPayouts } from "../services/payout.service.js";
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
      const event = JSON.parse(message.value.toString());
      const { tenantId } = event;
      const { paymentId, amount, currency, status } = event.payload;

      // Only process succeeded payments for auto-settlement
      if (status !== "succeeded") {
        logger.info(
          { paymentId, status },
          "skipping payout — payment not succeeded",
        );
        return;
      }

      await processPendingPayouts({ tenantId, amount, currency, paymentId });
    },
  });

  logger.info("payout-service consumer started — listening on payment.created");
};
