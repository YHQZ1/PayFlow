import { Router } from "express";
import * as controller from "../controllers/reconciliation.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/health", controller.health);

// Apply auth to reconciliation routes (if needed)
// Uncomment if you want to protect these endpoints
// router.use(authenticate);

router.post("/run", controller.run);
router.get("/runs", controller.listRuns);
router.get("/runs/:runId/mismatches", controller.getMismatches);

export default router;
