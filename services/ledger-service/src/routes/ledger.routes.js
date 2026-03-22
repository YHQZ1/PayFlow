import { Router } from "express";
import * as controller from "../controllers/ledger.controller.js";

const router = Router();

router.get("/health", controller.health);
router.get("/balances/:tenantId", controller.getBalance);
router.get("/journal/:tenantId", controller.getJournal);
router.get(
  "/journal/:tenantId/payment/:paymentId",
  controller.getJournalByPayment,
);

export default router;
