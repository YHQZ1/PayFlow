import { Router } from "express";
import * as controller from "../controllers/fraud.controller.js";

const router = Router();

router.get("/health", controller.health);
router.get("/risk/:tenantId", controller.getRisk);
router.delete("/risk/:tenantId", controller.resetRisk);

export default router;
