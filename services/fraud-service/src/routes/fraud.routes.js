import { Router } from "express";
import * as controller from "../controllers/fraud.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/health", controller.health);

// Apply auth to fraud routes
router.use(authenticate);

router.get("/risk/:tenantId", controller.getRisk);
router.delete("/risk/:tenantId", controller.resetRisk);

export default router;
