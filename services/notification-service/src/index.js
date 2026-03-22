import "dotenv/config";
import { startConsumer } from "./kafka/consumer.js";
import { logger } from "./logger.js";

const start = async () => {
  try {
    await startConsumer();
  } catch (err) {
    logger.error({ err }, "failed to start notification-service");
    process.exit(1);
  }
};

start();
