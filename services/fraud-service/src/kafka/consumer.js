import { Kafka } from "kafkajs";
import { runRules } from "../rules/engine.js";
import { publishFraudAlert } from "./producer.js";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "fraud-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID });

export const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "payment.created", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      const { tenantId } = event;
      const { paymentId, amount, status } = event.payload;

      const result = await runRules({ tenantId, amount, status });

      if (result.flagged) {
        logger.warn(
          { paymentId, tenantId, score: result.score, flags: result.flags },
          "payment flagged for fraud",
        );
        await publishFraudAlert({
          tenantId,
          paymentId,
          score: result.score,
          flags: result.flags,
        });
      } else {
        logger.info(
          { paymentId, score: result.score },
          "payment cleared by fraud engine",
        );
      }
    },
  });

  logger.info("fraud-service consumer started");
};
