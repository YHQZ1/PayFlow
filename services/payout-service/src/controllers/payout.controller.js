import * as payoutService from "../services/payout.service.js";
import { ValidationError, NotFoundError } from "../errors.js";

export const health = async (req, res) => {
  const result = await payoutService.checkHealth();
  res.status(result.status === "ok" ? 200 : 503).json(result);
};

export const create = async (req, res, next) => {
  try {
    const { tenantId, amount, currency, description, metadata } = req.body;

    if (!tenantId || !amount) {
      return next(new ValidationError("tenantId and amount are required"));
    }
    if (typeof amount !== "number" || amount <= 0) {
      return next(new ValidationError("amount must be a positive number"));
    }

    const payout = await payoutService.createPayout({
      tenantId,
      amount,
      currency,
      description,
      metadata,
    });
    res.status(201).json(payout);
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    const tenantId = req.query.tenantId;
    if (!tenantId)
      return next(new ValidationError("tenantId query param is required"));

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    const result = await payoutService.listPayouts({
      tenantId,
      status,
      limit,
      offset,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const payout = await payoutService.getPayout(req.params.id);
    if (!payout) return next(new NotFoundError("payout"));
    res.json(payout);
  } catch (err) {
    next(err);
  }
};
