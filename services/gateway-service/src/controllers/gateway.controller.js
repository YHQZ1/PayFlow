import * as gatewayService from "../services/gateway.service.js";
import { ValidationError } from "../errors.js";

export const health = async (req, res) => {
  const result = await gatewayService.checkHealth();
  res.status(result.status === "ok" ? 200 : 503).json(result);
};

export const charge = async (req, res, next) => {
  try {
    const { amount, currency, paymentId, tenantId, description } = req.body;
    if (!amount || !paymentId || !tenantId) {
      return next(
        new ValidationError("amount, paymentId and tenantId are required"),
      );
    }
    const result = await gatewayService.charge({
      amount,
      currency,
      paymentId,
      tenantId,
      description,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const refund = async (req, res, next) => {
  try {
    const { providerRef, amount, reason } = req.body;
    if (!providerRef || !amount) {
      return next(new ValidationError("providerRef and amount are required"));
    }
    const result = await gatewayService.refund({ providerRef, amount, reason });
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
    const charges = gatewayService.listAllCharges();
    res.json({ data: charges });
  } catch (err) {
    next(err);
  }
};
