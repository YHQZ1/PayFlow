import rateLimit from "express-rate-limit";
import "dotenv/config";

// Per-tenant rate limiter — uses tenant ID as the key after auth
// Falls back to IP if no tenant ID (for public routes)
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.tenantId || req.ip,
  message: {
    error: "too many requests",
    code: "RATE_LIMITED",
    requestId: null, // filled dynamically
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "too many requests — slow down",
      code: "RATE_LIMITED",
      requestId: req.requestId,
      retryAfter: res.getHeader("Retry-After"),
    });
  },
});
