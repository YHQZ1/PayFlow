import "dotenv/config";
import app from "./app.js";
import { connectProducer } from "./kafka/producer.js";
import { startConsumer } from "./kafka/consumer.js";
import { logger } from "./logger.js";

const PORT = process.env.PORT || 3002;

const start = async () => {
  try {
    await connectProducer();
    await startConsumer();
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "fraud-service started");
    });
  } catch (err) {
    logger.error({ err }, "failed to start fraud-service");
    process.exit(1);
  }
};

start();
