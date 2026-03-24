import "dotenv/config";
import app from "./app.js";
import { startConsumer } from "./kafka/consumer.js";
import { connectProducer } from "./kafka/producer.js";
import { logger } from "./logger.js";
import { db } from "./db/index.js";
import { redis } from "./redis.js";

const PORT = process.env.PORT || 3001;

const start = async () => {
  try {
    await connectProducer();
    await startConsumer();
    const server = app.listen(PORT, () => {
      logger.info({ port: PORT }, "ledger-service started");
    });

    const shutdown = async () => {
      logger.info("shutting down ledger-service");
      await new Promise((resolve) => server.close(resolve));
      await redis.quit();
      await db.$client.end();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    logger.error({ err }, "failed to start ledger-service");
    process.exit(1);
  }
};

start();
