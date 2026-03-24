import { Kafka } from "kafkajs";
import {
  writeJournalEntries,
  writeRefundEntries,
} from "../services/ledger.service.js";
// Remove this line: import { withIdempotency } from "../utils/idempotency.js";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "ledger-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || "ledger-service-cg",
  allowAutoTopicCreation: true,
});

const producer = kafka.producer();

const publishToDLQ = async (originalTopic, message, error) => {
  await producer.send({
    topic: `${originalTopic}.dlq`,
    messages: [
      {
        value: JSON.stringify({
          originalTopic,
          originalMessage: message.value?.toString(),
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });
  logger.error({ originalTopic, error: error.message }, "message sent to DLQ");
};

export const startConsumer = async () => {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({
    topics: ["payment.created", "payment.refunded"],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message, topic, partition, offset }) => {
      try {
        const event = JSON.parse(message.value.toString());
        const { paymentId, amount, currency, status } = event.payload;
        const { tenantId } = event;

        if (topic === "payment.refunded") {
          // Remove withIdempotency wrapper - just call the function directly
          await writeRefundEntries({ paymentId, tenantId, amount, currency });
          logger.info(
            { paymentId, tenantId, amount },
            "refund journal entries written",
          );
          return;
        }

        if (status !== "succeeded") {
          logger.info(
            { paymentId, status },
            "skipping ledger — payment not succeeded",
          );
          return;
        }

        // Remove withIdempotency wrapper - just call the function directly
        await writeJournalEntries({ paymentId, tenantId, amount, currency });
        logger.info({ paymentId, tenantId, amount }, "journal entries written");
      } catch (err) {
        logger.error(
          { err, offset, partition, topic },
          "failed to process message",
        );
        await publishToDLQ(topic, message, err);
      }
    },
  });

  logger.info("ledger-service consumer started");
};

const shutdown = async () => {
  await consumer.disconnect();
  await producer.disconnect();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
