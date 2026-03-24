import { Router } from "express";
import CircuitBreaker from "opossum";
import { authenticate } from "../middleware/auth.middleware.js";
import { authenticatedRateLimiter } from "../middleware/rateLimiter.middleware.js";
import { services } from "../config/services.js";
import { logger } from "../logger.js";
import "dotenv/config";

const router = Router();

const TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS) || 10_000;
const MAX_RETRIES = 3;

const sanitizePath = (path) => {
  return path.replace(/\.\./g, "").replace(/\/\//g, "/");
};

const fetchWithRetry = async (url, options, retries = MAX_RETRIES) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, i) * 100));
        continue;
      }
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 100));
    }
  }
};

const createBreaker = (svc) =>
  new CircuitBreaker(
    async (targetUrl, fetchOptions) => {
      return fetchWithRetry(targetUrl, fetchOptions);
    },
    {
      timeout: TIMEOUT_MS,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      name: svc.name,
    },
  );

const breakers = {};

const proxyTo = (svc) => async (req, res) => {
  if (!breakers[svc.name]) {
    breakers[svc.name] = createBreaker(svc);
  }

  const breaker = breakers[svc.name];
  const sanitizedPath = sanitizePath(req.originalUrl);
  const targetUrl = `${svc.url}${sanitizedPath}`;

  logger.info(
    { requestId: req.requestId, method: req.method, target: targetUrl },
    "proxying request",
  );

  try {
    const headers = {
      "Content-Type": "application/json",
      "X-Request-ID": req.requestId || "",
    };

    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization;
    }

    if (req.tenantId) {
      headers["X-Tenant-ID"] = req.tenantId;
    }

    if (req.headers["x-internal-token"]) {
      headers["X-Internal-Token"] = req.headers["x-internal-token"];
    }

    if (req.headers["idempotency-key"]) {
      headers["Idempotency-Key"] = req.headers["idempotency-key"];
    }

    const hasBody =
      ["POST", "PUT", "PATCH"].includes(req.method) &&
      req.body &&
      Object.keys(req.body).length > 0;

    const response = await breaker.fire(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const contentType = response.headers.get("content-type") || "";

    res.status(response.status);

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.json(data);
    }

    return res.send(await response.text());
  } catch (err) {
    if (breaker.status === "open") {
      return res.status(503).json({
        error: `${svc.name} is temporarily unavailable (circuit open)`,
        code: "CIRCUIT_OPEN",
        requestId: req.requestId,
      });
    }

    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return res.status(504).json({
        error: `${svc.name} timed out`,
        code: "GATEWAY_TIMEOUT",
        requestId: req.requestId,
      });
    }

    logger.error(
      { err, requestId: req.requestId, target: svc.name },
      "proxy error",
    );

    return res.status(503).json({
      error: `${svc.name} is unavailable`,
      code: "SERVICE_UNAVAILABLE",
      requestId: req.requestId,
    });
  }
};

Object.values(services).forEach((svc) => {
  router.get(`${svc.pathPrefix}/health`, proxyTo(svc));
});

router.all(
  "/tenants{/*path}",
  authenticate,
  authenticatedRateLimiter,
  proxyTo(services.tenants),
);
router.all(
  "/payments{/*path}",
  authenticate,
  authenticatedRateLimiter,
  proxyTo(services.payments),
);
router.all(
  "/ledger{/*path}",
  authenticate,
  authenticatedRateLimiter,
  proxyTo(services.ledger),
);
router.all(
  "/fraud{/*path}",
  authenticate,
  authenticatedRateLimiter,
  proxyTo(services.fraud),
);
router.all(
  "/payouts{/*path}",
  authenticate,
  authenticatedRateLimiter,
  proxyTo(services.payouts),
);
router.all(
  "/reconciliation{/*path}",
  authenticate,
  authenticatedRateLimiter,
  proxyTo(services.reconciliation),
);

export default router;
