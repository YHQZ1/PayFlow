import type { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import type { KafkaEvent } from "./types";
import type { Topic } from "./topics";

export type EventHandler<T> = (event: KafkaEvent<T>) => Promise<void>;

export interface PayflowConsumer {
  subscribe<T>(topic: Topic, handler: EventHandler<T>): Promise<void>;
  disconnect(): Promise<void>;
}

export async function createConsumer(
  kafka: Kafka,
  groupId: string,
): Promise<PayflowConsumer> {
  const consumer: Consumer = kafka.consumer({ groupId });
  await consumer.connect();

  return {
    async subscribe<T>(topic: Topic, handler: EventHandler<T>): Promise<void> {
      await consumer.subscribe({ topic, fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const event = JSON.parse(message.value.toString()) as KafkaEvent<T>;
          await handler(event);
        },
      });
    },

    async disconnect(): Promise<void> {
      await consumer.disconnect();
    },
  };
}
