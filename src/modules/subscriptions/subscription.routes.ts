import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { readSubscription, revenueCatWebhook } from "./subscription.controller.js";

const router = Router();
router.get("/me", protect, readSubscription);
router.post("/webhook", revenueCatWebhook);

export default router;
