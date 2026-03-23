import "dotenv/config";
import app from "./app.js";
import { startConsumer } from "./kafka/consumer.js";
import { logger } from "./logger.js";

const PORT = process.env.PORT || 3007;

const start = async () => {
  try {
    await startConsumer();
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "notification-service started");
    });
  } catch (err) {
    logger.error({ err }, "failed to start notification-service");
    process.exit(1);
  }
};

start();
