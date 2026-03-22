import { Kafka } from "kafkajs";
import { runRules } from "../rules/engine.js";
import { publishFraudAlert } from "./producer.js";
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
        console.log(
          `fraud flagged — payment ${paymentId} score ${result.score} flags: ${result.flags.join(", ")}`,
        );
        await publishFraudAlert({
          tenantId,
          paymentId,
          score: result.score,
          flags: result.flags,
        });
      } else {
        console.log(`payment ${paymentId} cleared — score ${result.score}`);
      }
    },
  });

  console.log("fraud-service consumer started — listening on payment.created");
};
