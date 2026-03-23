import "dotenv/config";
import app from "./app.js";
import { startConsumer } from "./kafka/consumer.js";
import { logger } from "./logger.js";

const PORT = process.env.PORT || 3005;

const start = async () => {
  try {
    await startConsumer();
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "payout-service started");
    });
  } catch (err) {
    logger.error({ err }, "failed to start payout-service");
    process.exit(1);
  }
};

start();
