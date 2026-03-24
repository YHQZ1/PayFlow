import * as payoutService from "../services/payout.service.js";
import { ValidationError, NotFoundError } from "../errors.js";

const MIN_PAYOUT_AMOUNT = parseInt(process.env.MIN_PAYOUT_AMOUNT) || 100;
const MAX_PAYOUT_AMOUNT = parseInt(process.env.MAX_PAYOUT_AMOUNT) || 10_000_000;

export const health = async (req, res) => {
  const result = await payoutService.checkHealth();
  res.status(result.status === "ok" ? 200 : 503).json(result);
};

export const create = async (req, res, next) => {
  try {
    const { tenantId, amount, currency, description, metadata } = req.body;

    if (!tenantId || typeof tenantId !== "string") {
      return next(new ValidationError("tenantId is required"));
    }

    if (!amount || typeof amount !== "number") {
      return next(new ValidationError("amount must be a number"));
    }

    if (amount <= 0) {
      return next(new ValidationError("amount must be positive"));
    }

    if (amount < MIN_PAYOUT_AMOUNT) {
      return next(
        new ValidationError(`minimum payout amount is ${MIN_PAYOUT_AMOUNT}`),
      );
    }

    if (amount > MAX_PAYOUT_AMOUNT) {
      return next(
        new ValidationError(`maximum payout amount is ${MAX_PAYOUT_AMOUNT}`),
      );
    }

    if (currency && !/^[A-Z]{3}$/.test(currency)) {
      return next(new ValidationError("currency must be a 3-letter ISO code"));
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
    if (!tenantId) {
      return next(new ValidationError("tenantId query param is required"));
    }

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
