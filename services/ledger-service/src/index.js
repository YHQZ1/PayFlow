import { startConsumer } from "./kafka/consumer.js";

const start = async () => {
  await startConsumer();
};

start();
