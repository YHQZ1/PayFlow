import "dotenv/config";
import app from "./app.js";
import { connectProducer } from "./kafka/producer.js";
import { startConsumer } from "./kafka/consumer.js";
import "./cron/outbox.cron.js";
import { logger } from "./logger.js";
import { db } from "./db/index.js";
import { redis } from "./redis.js";

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectProducer();
    await startConsumer();

    const server = app.listen(PORT, () => {
      logger.info({ port: PORT }, "payment-service started");
    });

    const shutdown = async () => {
      logger.info("shutting down payment-service");
      await new Promise((resolve) => server.close(resolve));
      await producer.disconnect();
      await consumer.disconnect();
      await redis.quit();
      await db.$client.end();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    logger.error({ err }, "failed to start payment-service");
    process.exit(1);
  }
};

start();
