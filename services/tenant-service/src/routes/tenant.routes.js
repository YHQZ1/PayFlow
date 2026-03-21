import { Router } from "express";
import { create, getById } from "../controllers/tenant.controller.js";

const router = Router();

router.post("/", create);
router.get("/:id", getById);

export default router;
