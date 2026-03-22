import "dotenv/config";
import app from "./app.js";
import { connectProducer } from "./kafka/producer.js";
import { logger } from "./logger.js";

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectProducer();
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "payment-service started");
    });
  } catch (err) {
    logger.error({ err }, "failed to start payment-service");
    process.exit(1);
  }
};

start();
