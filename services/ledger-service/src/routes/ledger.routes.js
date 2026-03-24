import { Router } from "express";
import * as controller from "../controllers/ledger.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/health", controller.health);

// Apply auth to all ledger routes
router.use(authenticate);

router.get("/balances/:tenantId", controller.getBalance);
router.get("/journal/:tenantId", controller.getJournal);
router.get(
  "/journal/:tenantId/payment/:paymentId",
  controller.getJournalByPayment,
);

export default router;
