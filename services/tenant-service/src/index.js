import "dotenv/config";
import app from "./app.js";
import { logger } from "./logger.js";

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  logger.info({ port: PORT }, "tenant-service started");
});
