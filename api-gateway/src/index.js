import "dotenv/config";
import app from "./app.js";
import { logger } from "./logger.js";
import { serviceList } from "./config/services.js";

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "api-gateway started");
  logger.info(
    { routes: serviceList.map((s) => `${s.pathPrefix} → ${s.name}`) },
    "registered routes"
  );
});

const shutdown = async () => {
  logger.info("shutting down gateway");
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);