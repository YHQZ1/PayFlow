import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { services } from "../config/services.js";
import { logger } from "../logger.js";
import "dotenv/config";

const router = Router();

const TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS) || 10_000;

const proxyTo = (svc) => async (req, res) => {
  const targetUrl = `${svc.url}${req.originalUrl}`;

  logger.info(
    { requestId: req.requestId, method: req.method, target: targetUrl },
    "proxying request",
  );

  try {
    const headers = {
      "Content-Type": "application/json",
      "X-Request-ID": req.requestId || "",
    };
    if (req.headers.authorization)
      headers["Authorization"] = req.headers.authorization;
    if (req.tenantId) headers["X-Tenant-ID"] = req.tenantId;
    if (req.headers["idempotency-key"])
      headers["Idempotency-Key"] = req.headers["idempotency-key"];

    const hasBody =
      ["POST", "PUT", "PATCH"].includes(req.method) &&
      req.body &&
      Object.keys(req.body).length > 0;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const contentType = response.headers.get("content-type") || "";
    res.status(response.status);
    if (contentType.includes("application/json"))
      return res.json(await response.json());
    return res.send(await response.text());
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res
        .status(504)
        .json({
          error: `${svc.name} timed out`,
          code: "GATEWAY_TIMEOUT",
          requestId: req.requestId,
        });
    }
    logger.error(
      { err, requestId: req.requestId, target: svc.name },
      "proxy error",
    );
    return res
      .status(503)
      .json({
        error: `${svc.name} is unavailable`,
        code: "SERVICE_UNAVAILABLE",
        requestId: req.requestId,
      });
  }
};

// ─── Public routes ────────────────────────────────────────────
router.all("/tenants{/*path}", proxyTo(services.tenants));
router.all("/gateway{/*path}", proxyTo(services.gateway));
router.all("/notifications{/*path}", proxyTo(services.notifications));

// ─── Authenticated routes ─────────────────────────────────────
router.all("/payments{/*path}", authenticate, proxyTo(services.payments));
router.all("/ledger{/*path}", authenticate, proxyTo(services.ledger));
router.all("/fraud{/*path}", authenticate, proxyTo(services.fraud));
router.all("/payouts{/*path}", authenticate, proxyTo(services.payouts));
router.all(
  "/reconciliation{/*path}",
  authenticate,
  proxyTo(services.reconciliation),
);

export default router;
