import express from "express";
import pinoHttp from "pino-http";
import { logger } from "./logger.js";

const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/notifications/health", (req, res) => {
  res.json({
    status: "ok",
    service: "notification-service",
    timestamp: new Date().toISOString(),
    checks: { consumer: "ok" },
  });
});

export default app;
