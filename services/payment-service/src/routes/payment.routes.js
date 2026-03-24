import { Router } from "express";
import * as controller from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  validate,
  createPaymentSchema,
  refundPaymentSchema,
} from "../middleware/validate.middleware.js";

const router = Router();

router.get("/health", controller.health);

// Apply auth to all payment routes
router.use(authenticate);

router.post("/", validate(createPaymentSchema), controller.create);
router.post("/:id/refund", validate(refundPaymentSchema), controller.refund);
router.get("/", controller.list);
router.get("/:id", controller.getById);

export default router;
