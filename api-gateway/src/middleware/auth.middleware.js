import crypto from "crypto";
import { logger } from "../logger.js";
import "dotenv/config";

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "missing api key",
      code: "UNAUTHORIZED",
      requestId: req.requestId,
    });
  }

  // Extract the raw API key - DO NOT HASH IT HERE
  const rawKey = authHeader.split(" ")[1];

  try {
    // Send the RAW key to tenant service for validation
    const response = await fetch(
      `${process.env.TENANT_SERVICE_URL}/tenants/keys/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": req.requestId,
        },
        body: JSON.stringify({ rawKey }), // Send raw key, not hashed
        signal: AbortSignal.timeout(
          parseInt(process.env.AUTH_TIMEOUT_MS) || 5000,
        ),
      },
    );

    if (!response.ok) {
      return res.status(401).json({
        error: "invalid api key",
        code: "UNAUTHORIZED",
        requestId: req.requestId,
      });
    }

    const { tenantId } = await response.json();
    req.tenantId = tenantId;

    // Generate internal token for service-to-service communication
    const internalToken = crypto
      .createHmac(
        "sha256",
        process.env.INTERNAL_TOKEN_SECRET || "payflow-internal-secret",
      )
      .update(`${tenantId}:${Date.now()}`)
      .digest("hex");

    // Set headers for downstream services
    req.headers["x-tenant-id"] = tenantId;
    req.headers["x-request-id"] = req.requestId;
    req.headers["x-internal-token"] = internalToken;

    logger.info(
      { requestId: req.requestId, tenantId, path: req.path },
      "request authenticated",
    );
    next();
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, "auth service unreachable");
    res.status(503).json({
      error: "authentication service unavailable",
      code: "SERVICE_UNAVAILABLE",
      requestId: req.requestId,
    });
  }
};
