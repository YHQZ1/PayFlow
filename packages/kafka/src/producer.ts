import type { Kafka, Producer } from "kafkajs";
import { generateId, toTimestamp } from "@payflow/shared";
import type { KafkaEvent } from "./types";
import type { Topic } from "./topics";

export interface PayflowProducer {
  publish<T>(topic: Topic, tenantId: string, payload: T): Promise<void>;
  disconnect(): Promise<void>;
}

export async function createProducer(kafka: Kafka): Promise<PayflowProducer> {
  const producer: Producer = kafka.producer();
  await producer.connect();

  return {
    async publish<T>(
      topic: Topic,
      tenantId: string,
      payload: T,
    ): Promise<void> {
      const event: KafkaEvent<T> = {
        eventId: generateId(),
        topic,
        tenantId,
        timestamp: toTimestamp(new Date()),
        payload,
      };

      await producer.send({
        topic,
        messages: [
          {
            key: tenantId,
            value: JSON.stringify(event),
          },
        ],
      });
    },

    async disconnect(): Promise<void> {
      await producer.disconnect();
    },
  };
}
