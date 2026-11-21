import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  mealCategories,
  mealLookup,
  searchMeals,
} from "./external-meals.controller.js";

const router = Router();
const mealsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.get("/search", mealsLimiter, searchMeals);
router.get("/categories", mealsLimiter, mealCategories);
router.get("/lookup/:id", mealsLimiter, mealLookup);

export default router;
