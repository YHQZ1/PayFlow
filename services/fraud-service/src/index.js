import { connectProducer } from "./kafka/producer.js";
import { startConsumer } from "./kafka/consumer.js";

const start = async () => {
  await connectProducer();
  await startConsumer();
};

start();
