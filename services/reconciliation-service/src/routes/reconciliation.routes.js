import { Router } from "express";
import * as controller from "../controllers/reconciliation.controller.js";

const router = Router();

router.get("/health", controller.health);
router.post("/run", controller.run);
router.get("/runs", controller.listRuns);
router.get("/runs/:runId/mismatches", controller.getMismatches);

export default router;
