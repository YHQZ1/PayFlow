import "dotenv/config";
import app from "./app.js";
import { connectProducer } from "./kafka/producer.js";
import { logger } from "./logger.js";

const PORT = process.env.PORT || 3006;

const start = async () => {
  try {
    await connectProducer();
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "reconciliation-service started");
    });
  } catch (err) {
    logger.error({ err }, "failed to start reconciliation-service");
    process.exit(1);
  }
};

start();
