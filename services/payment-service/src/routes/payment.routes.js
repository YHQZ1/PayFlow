import { Router } from "express";
import * as controller from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getById);

export default router;
