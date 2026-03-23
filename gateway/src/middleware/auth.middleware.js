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

  const rawKey = authHeader.split(" ")[1];

  try {
    const response = await fetch(
      `${process.env.TENANT_SERVICE_URL}/tenants/keys/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": req.requestId,
        },
        body: JSON.stringify({ rawKey }),
        signal: AbortSignal.timeout(5000),
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

    // Inject tenant ID downstream so services don't need to re-validate
    req.headers["x-tenant-id"] = tenantId;
    req.headers["x-request-id"] = req.requestId;

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
