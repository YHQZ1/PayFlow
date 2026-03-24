import * as paymentService from "../services/payment.service.js";
import { withIdempotency } from "../utils/idempotency.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { listPaymentsQuerySchema } from "../middleware/validate.middleware.js";

export const health = async (req, res) => {
  const result = await paymentService.checkHealth();
  res.status(result.status === "ok" ? 200 : 503).json(result);
};

export const create = async (req, res, next) => {
  const idempotencyKey = req.headers["idempotency-key"];
  if (!idempotencyKey) {
    return next(new ValidationError("idempotency-key header is required"));
  }

  try {
    const result = await withIdempotency(
      `${req.tenantId}:${idempotencyKey}`,
      async () => {
        return await paymentService.createPayment({
          tenantId: req.tenantId,
          idempotencyKey,
          ...req.body,
        });
      },
    );
    res.status(result.idempotent ? 200 : 201).json(result);
  } catch (err) {
    next(err);
  }
};

// Add refund controller
export const refund = async (req, res, next) => {
  const idempotencyKey = req.headers["idempotency-key"];
  if (!idempotencyKey) {
    return next(new ValidationError("idempotency-key header is required"));
  }

  try {
    const result = await withIdempotency(
      `${req.tenantId}:refund:${req.params.id}:${idempotencyKey}`,
      async () => {
        return await paymentService.refundPayment({
          paymentId: req.params.id,
          tenantId: req.tenantId,
          idempotencyKey,
          amount: req.body.amount,
          reason: req.body.reason,
        });
      },
    );
    res.status(result.idempotent ? 200 : 201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const payment = await paymentService.getPayment(
      req.params.id,
      req.tenantId,
    );
    if (!payment) return next(new NotFoundError("payment"));
    res.json(payment);
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    const parsed = listPaymentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const details = (parsed.error.issues ?? parsed.error.errors ?? []).map(
        (e) => ({
          field: e.path.join("."),
          message: e.message,
        }),
      );
      return next(new ValidationError("invalid query parameters", details));
    }
    const { status, limit, offset } = parsed.data;
    const result = await paymentService.listPayments({
      tenantId: req.tenantId,
      status,
      limit,
      offset,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
