import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  generateRecipe,
  listRecipes,
  readRecipe,
  removeRecipe,
  updateFavorite,
} from "./recipe.controller.js";

const router = Router();
router.use(protect);
router.get("/", listRecipes);
router.post("/generate", generateRecipe);
router.get("/:id", readRecipe);
router.patch("/:id/favorite", updateFavorite);
router.delete("/:id", removeRecipe);

export default router;
