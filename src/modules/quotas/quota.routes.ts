import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { readDailyQuota } from "./quota.middleware.js";

const router = Router();
router.get("/me", protect, readDailyQuota);

export default router;
