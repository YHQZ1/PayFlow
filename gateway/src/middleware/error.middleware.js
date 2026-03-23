import { logger } from "../logger.js";

export const errorHandler = (err, req, res, next) => {
  logger.error(
    { err, requestId: req.requestId, path: req.path },
    "unhandled gateway error",
  );
  res.status(500).json({
    error: "internal gateway error",
    code: "GATEWAY_ERROR",
    requestId: req.requestId,
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    error: `no route for ${req.method} ${req.path}`,
    code: "ROUTE_NOT_FOUND",
    requestId: req.requestId,
  });
};
