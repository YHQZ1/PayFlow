import { Kafka } from "kafkajs";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "payment-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
});

const producer = kafka.producer();

export const connectProducer = async () => {
  await producer.connect();
  console.log("kafka producer connected");
};

export const publishEvent = async (topic, event) => {
  await producer.send({
    topic,
    messages: [
      {
        key: event.tenantId,
        value: JSON.stringify(event),
      },
    ],
  });
};
