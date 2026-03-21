import * as paymentService from "../services/payment.service.js";
import { checkIdempotency, saveIdempotency } from "../utils/idempotency.js";

export const create = async (req, res) => {
  try {
    const idempotencyKey = req.headers["idempotency-key"];
    if (!idempotencyKey) {
      return res
        .status(400)
        .json({ error: "idempotency-key header is required" });
    }

    const cached = await checkIdempotency(`${req.tenantId}:${idempotencyKey}`);
    if (cached) return res.status(200).json({ ...cached, idempotent: true });

    const { amount, currency = "INR", description } = req.body;
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: "amount must be a positive integer" });
    }

    const payment = await paymentService.createPayment({
      tenantId: req.tenantId,
      amount,
      currency,
      description,
      idempotencyKey,
    });

    await saveIdempotency(`${req.tenantId}:${idempotencyKey}`, payment);
    res.status(201).json(payment);
  } catch (error) {
    if (error.message?.includes("unique constraint")) {
      return res.status(409).json({ error: "duplicate idempotency key" });
    }
    res.status(500).json({ error: "internal server error" });
  }
};

export const getById = async (req, res) => {
  try {
    const payment = await paymentService.getPayment(
      req.params.id,
      req.tenantId,
    );
    if (!payment) return res.status(404).json({ error: "payment not found" });
    res.json(payment);
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};

export const list = async (req, res) => {
  try {
    const result = await paymentService.listPayments(req.tenantId);
    res.json(result);
  } catch {
    res.status(500).json({ error: "internal server error" });
  }
};
