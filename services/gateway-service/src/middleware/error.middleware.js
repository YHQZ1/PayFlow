import { AppError } from "../errors.js";
import { logger } from "../logger.js";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError && err.isOperational) {
    const body = { error: err.message, code: err.code };
    if (err.details?.length) body.details = err.details;
    if (err.providerCode) body.providerCode = err.providerCode;
    return res.status(err.statusCode).json(body);
  }
  logger.error(
    { err, req: { method: req.method, url: req.url } },
    "unhandled error",
  );
  res
    .status(500)
    .json({ error: "internal server error", code: "INTERNAL_ERROR" });
};

export const notFound = (req, res) => {
  res.status(404).json({
    error: `route ${req.method} ${req.path} not found`,
    code: "ROUTE_NOT_FOUND",
  });
};
