import express from "express";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { logger } from "./logger.js";
import paymentRoutes from "./routes/payment.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

app.use(
  "/payments",
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many requests", code: "RATE_LIMITED" },
  }),
);

app.use("/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
