import { Kafka } from "kafkajs";
import { writeJournalEntries } from "../services/ledger.service.js";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "ledger-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID,
  allowAutoTopicCreation: true,
});

export const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({
    topics: ["payment.created", "payment.failed"],
    fromBeginning: true,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      const { paymentId, amount, currency, status } = event.payload;
      const { tenantId } = event;

      if (status !== "succeeded") {
        logger.info(
          { paymentId, status },
          "skipping ledger — payment not succeeded",
        );
        return;
      }

      await writeJournalEntries({ paymentId, tenantId, amount, currency });
      logger.info({ paymentId, tenantId, amount }, "journal entries written");
    },
  });

  logger.info("ledger-service consumer started");
};
