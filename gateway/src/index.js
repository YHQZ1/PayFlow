import "dotenv/config";
import app from "./app.js";
import { logger } from "./logger.js";
import { serviceList } from "./config/services.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info({ port: PORT }, "api-gateway started");
  logger.info(
    { routes: serviceList.map((s) => `${s.pathPrefix} → ${s.name}`) },
    "registered routes",
  );
});
