import { Router } from "express";
import * as controller from "../controllers/notification.controller.js";
// Auth not needed for now - no protected endpoints
// import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/health", controller.health);

// No protected endpoints currently
// Add auth when you add endpoints that need tenant context

export default router;