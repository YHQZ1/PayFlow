import { Kafka } from "kafkajs";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "payout-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const producer = kafka.producer();

export const connectProducer = async () => {
  await producer.connect();
  logger.info("payout-service producer connected");
};

export const publishEvent = async (topic, event) => {
  await producer.send({
    topic,
    messages: [{ key: event.tenantId, value: JSON.stringify(event) }],
  });
};

const shutdown = async () => {
  await producer.disconnect();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
