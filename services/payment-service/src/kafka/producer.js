import { Kafka } from "kafkajs";
import { logger } from "../logger.js";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "payment-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const producer = kafka.producer();

export const connectProducer = async () => {
  await producer.connect();
  logger.info("payment-service producer connected");
};

export const publishEvent = async (topic, event) => {
  await producer.send({
    topic,
    messages: [{ key: event.tenantId, value: JSON.stringify(event) }],
  });
};
