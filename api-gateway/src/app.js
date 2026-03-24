import express from "express";
import pinoHttp from "pino-http";
import compression from "express-compression";
import { logger } from "./logger.js";
import { requestId } from "./middleware/requestId.middleware.js";
import {
  publicRateLimiter,
  authenticatedRateLimiter,
} from "./middleware/rateLimiter.middleware.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import proxyRoutes from "./routes/proxy.routes.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(compression());
app.use(requestId);

app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({ requestId: req.requestId }),
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }),
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Idempotency-Key, X-Request-ID",
  );
  res.setHeader("Access-Control-Expose-Headers", "X-Request-ID");
  if (req.method === "OPTIONS") return res.status(204).send();
  next();
});

app.use("/", publicRateLimiter, healthRoutes);
app.use("/", proxyRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
