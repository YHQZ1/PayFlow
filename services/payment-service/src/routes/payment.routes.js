import { Router } from "express";
import * as controller from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  validate,
  createPaymentSchema,
} from "../middleware/validate.middleware.js";

const router = Router();

router.get("/health", controller.health);

router.use(authenticate);

router.post("/", validate(createPaymentSchema), controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getById);

export default router;
