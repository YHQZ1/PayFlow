import "dotenv/config";
import app from "./app.js";
import { logger } from "./logger.js";

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  logger.info({ port: PORT }, "gateway-service started");
});
