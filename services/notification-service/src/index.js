import "dotenv/config";
import app from "./app.js";
import { startConsumer } from "./kafka/consumer.js";
import { logger } from "./logger.js";
import { db } from "./db/index.js";

const PORT = process.env.PORT || 3007;

const start = async () => {
  try {
    await startConsumer();
    const server = app.listen(PORT, () => {
      logger.info({ port: PORT }, "notification-service started");
    });

    const shutdown = async () => {
      logger.info("shutting down notification-service");
      await new Promise((resolve) => server.close(resolve));
      await db.$client?.end();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    logger.error({ err }, "failed to start notification-service");
    process.exit(1);
  }
};

start();
