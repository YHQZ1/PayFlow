import { Router } from "express";
import * as controller from "../controllers/tenant.controller.js";

const router = Router();

// Tenants
router.post("/", controller.create);
router.get("/:id", controller.getById);

// API Keys
router.post("/:id/keys", controller.generateKey);
router.get("/:id/keys", controller.listKeys);
router.delete("/:id/keys/:keyId", controller.revokeKey);

// Webhooks
router.post("/:id/webhooks", controller.addWebhook);
router.get("/:id/webhooks", controller.listWebhooks);
router.delete("/:id/webhooks/:webhookId", controller.removeWebhook);

export default router;
