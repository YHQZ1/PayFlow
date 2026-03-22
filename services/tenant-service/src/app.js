import express from "express";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { logger } from "./logger.js";
import tenantRoutes from "./routes/tenant.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

app.use(
  "/tenants",
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many requests", code: "RATE_LIMITED" },
  }),
);

app.use("/tenants", tenantRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
