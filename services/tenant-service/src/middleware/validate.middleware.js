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
  name: z.string().min(2, "name must be at least 2 characters").max(255).trim().regex(/^[a-zA-Z0-9\s\-']+$/, "name contains invalid characters"),
  email: z.string().email("must be a valid email address").toLowerCase().trim(),
});

export const updateTenantSchema = z
  .object({
    name: z.string().min(2).max(255).trim().optional(),
    email: z.string().email().toLowerCase().trim().optional(),
    status: z.enum(["active", "suspended"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "at least one field required",
  });

export const addWebhookSchema = z.object({
  url: z.string().url("must be a valid URL").max(500).transform((url) => url.toLowerCase()),
});

export const validateKeySchema = z.object({
  rawKey: z.string().min(1, "rawKey is required"),
});