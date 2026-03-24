import * as gatewayService from "../services/gateway.service.js";
import { ValidationError } from "../errors.js";

export const health = async (req, res) => {
  const result = await gatewayService.checkHealth();
  res.status(result.status === "ok" ? 200 : 503).json({
    ...result,
    requestId: req.headers["x-request-id"],
  });
};

export const charge = async (req, res, next) => {
  const idempotencyKey = req.headers["idempotency-key"];
  const { amount, currency, paymentId, tenantId, description } = req.body;

  if (!idempotencyKey) {
    return next(new ValidationError("idempotency-key header is required"));
  }

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return next(new ValidationError("amount must be a positive number"));
  }

  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    return next(new ValidationError("currency must be a 3-letter ISO code"));
  }

  if (!paymentId || typeof paymentId !== "string") {
    return next(new ValidationError("paymentId is required"));
  }

  if (!tenantId || typeof tenantId !== "string") {
    return next(new ValidationError("tenantId is required"));
  }

  try {
    const result = await gatewayService.charge({
      amount,
      currency,
      paymentId,
      tenantId,
      description,
      idempotencyKey,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const refund = async (req, res, next) => {
  const idempotencyKey = req.headers["idempotency-key"];
  const { providerRef, amount, reason } = req.body;

  if (!idempotencyKey) {
    return next(new ValidationError("idempotency-key header is required"));
  }

  if (!providerRef || typeof providerRef !== "string") {
    return next(new ValidationError("providerRef is required"));
  }

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return next(new ValidationError("amount must be a positive number"));
  }

  try {
    const result = await gatewayService.refund({
      providerRef,
      amount,
      reason,
      idempotencyKey,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getCharge = async (req, res, next) => {
  try {
    const result = await gatewayService.getCharge(req.params.providerRef);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const listCharges = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const result = await gatewayService.listCharges({ limit, offset });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
