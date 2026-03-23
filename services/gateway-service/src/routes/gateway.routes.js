import { Router } from "express";
import * as controller from "../controllers/gateway.controller.js";

const router = Router();

router.get("/health", controller.health);
router.post("/charge", controller.charge);
router.post("/refund", controller.refund);
router.get("/charges", controller.listCharges);
router.get("/charge/:providerRef", controller.getCharge);

export default router;
