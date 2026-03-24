import { Router } from "express";
import { serviceList } from "../config/services.js";
import { logger } from "../logger.js";

const router = Router();

router.get("/health", async (req, res) => {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT_MS) || 10_000;

  const results = await Promise.allSettled(
    serviceList.map(async (svc) => {
      const start = Date.now();
      try {
        const response = await fetch(`${svc.url}${svc.healthPath}`, {
          signal: AbortSignal.timeout(timeout),
          headers: { "X-Request-ID": req.requestId },
        });
        const body = await response.json();
        return {
          service: svc.name,
          status: response.ok ? "ok" : "degraded",
          latencyMs: Date.now() - start,
          checks: body.checks ?? {},
        };
      } catch (err) {
        return {
          service: svc.name,
          status: "unreachable",
          latencyMs: Date.now() - start,
          error: err.message,
        };
      }
    }),
  );

  const services = results.map((r) => r.value ?? r.reason);
  const allOk = services.every((s) => s.status === "ok");
  const anyUnreachable = services.some((s) => s.status === "unreachable");

  const overallStatus = allOk ? "ok" : anyUnreachable ? "degraded" : "partial";

  logger.info(
    { requestId: req.requestId, status: overallStatus },
    "health check aggregated",
  );

  res.status(allOk ? 200 : 207).json({
    status: overallStatus,
    gateway: "api-gateway",
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    services,
  });
});

export default router;
