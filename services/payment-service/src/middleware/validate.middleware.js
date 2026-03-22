import { z } from "zod";
import { ValidationError } from "../errors.js";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = (result.error.issues ?? result.error.errors ?? []).map(
      (e) => ({
        field: e.path.join("."),
        message: e.message,
      }),
    );
    return next(new ValidationError("validation failed", details));
  }
  req.body = result.data;
  next();
};

export const createPaymentSchema = z.object({
  amount: z
    .number({
      required_error: "amount is required",
      invalid_type_error: "amount must be a number",
    })
    .int("amount must be an integer (smallest currency unit)")
    .positive("amount must be greater than 0")
    .max(100_000_000, "amount exceeds maximum allowed"),
  currency: z
    .string()
    .length(3, "currency must be a 3-letter ISO code")
    .toUpperCase()
    .default("INR"),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const listPaymentsQuerySchema = z.object({
  status: z.enum(["pending", "succeeded", "failed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
