import "dotenv/config";
import app from "./app.js";
import { logger } from "./logger.js";
import { db } from "./db/index.js";

const PORT = process.env.PORT || 3004;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "gateway-service started");
});

const shutdown = async () => {
  logger.info("shutting down gateway-service");
  await new Promise((resolve) => server.close(resolve));
  await db.$client?.end();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
