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

export const createTenantSchema = z.object({
  name: z.string().min(2, "name must be at least 2 characters").max(255),
  email: z.string().email("must be a valid email address"),
});

export const updateTenantSchema = z
  .object({
    name: z.string().min(2).max(255).optional(),
    email: z.string().email().optional(),
    status: z.enum(["active", "suspended"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "at least one field required",
  });

export const addWebhookSchema = z.object({
  url: z.string().url("must be a valid URL").max(500),
});

export const validateKeySchema = z.object({
  rawKey: z.string().min(1, "rawKey is required"),
});
