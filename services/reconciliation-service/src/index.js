import "dotenv/config";
import app from "./app.js";
import { connectProducer } from "./kafka/producer.js";
import { startConsumer } from "./kafka/consumer.js";
import { logger } from "./logger.js";
import { db } from "./db/index.js";
import "./cron/reconciliation.cron.js";

const PORT = process.env.PORT || 3006;

const start = async () => {
  try {
    await connectProducer();
    await startConsumer();
    const server = app.listen(PORT, () => {
      logger.info({ port: PORT }, "reconciliation-service started");
    });

    const shutdown = async () => {
      logger.info("shutting down reconciliation-service");
      await new Promise((resolve) => server.close(resolve));
      await db.$client.end();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    logger.error({ err }, "failed to start reconciliation-service");
    process.exit(1);
  }
};

start();
