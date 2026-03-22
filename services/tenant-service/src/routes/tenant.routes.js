import { Router } from "express";
import * as controller from "../controllers/tenant.controller.js";
import {
  validate,
  createTenantSchema,
  updateTenantSchema,
  addWebhookSchema,
  validateKeySchema,
} from "../middleware/validate.middleware.js";

const router = Router();

// ─── Health ───────────────────────────────────────────────────
router.get("/health", controller.health);

// ─── Tenants ──────────────────────────────────────────────────
router.get("/", controller.list);
router.post("/", validate(createTenantSchema), controller.create);
router.get("/:id", controller.getById);
router.put("/:id", validate(updateTenantSchema), controller.update);
router.delete("/:id", controller.remove);

// ─── API Keys ─────────────────────────────────────────────────
router.post(
  "/keys/validate",
  validate(validateKeySchema),
  controller.validateKey,
);
router.post("/:id/keys", controller.generateKey);
router.get("/:id/keys", controller.listKeys);
router.delete("/:id/keys/:keyId", controller.revokeKey);

// ─── Webhooks ─────────────────────────────────────────────────
router.post("/:id/webhooks", validate(addWebhookSchema), controller.addWebhook);
router.get("/:id/webhooks", controller.listWebhooks);
router.delete("/:id/webhooks/:webhookId", controller.removeWebhook);

export default router;
