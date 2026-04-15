import { Kafka, type KafkaConfig } from "kafkajs";

export function createKafkaClient(config: KafkaConfig): Kafka {
  return new Kafka(config);
}

export * from "./topics";
export * from "./types";
export * from "./producer";
export * from "./consumer";
