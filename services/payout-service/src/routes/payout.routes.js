import { Router } from "express";
import * as controller from "../controllers/payout.controller.js";

const router = Router();

router.get("/health", controller.health);
router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getById);

export default router;
