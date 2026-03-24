import rateLimit from "express-rate-limit";
import "dotenv/config";

export const publicRateLimiter = rateLimit({
  windowMs: parseInt(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.PUBLIC_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    error: "too many requests",
    code: "RATE_LIMITED",
    requestId: null,
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

export const authenticatedRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.tenantId,
  message: {
    error: "too many requests",
    code: "RATE_LIMITED",
    requestId: null,
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
