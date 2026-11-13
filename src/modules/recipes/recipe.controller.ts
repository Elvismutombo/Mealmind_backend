import type { Request, Response } from "express";
import { z } from "zod";
import { generateRecipeSchema, updateFavoriteSchema } from "./recipe.validation.js";
import {
  consumeDailyGeneration,
  getDailyQuota,
  refundDailyGeneration,
} from "../quotas/quota.service.js";
import {
  deleteRecipe,
  generateAndSaveRecipe,
  getRecipe,
  getRecipes,
  setRecipeFavorite,
} from "./recipe.service.js";

export const listRecipes = async (req: Request, res: Response) => {
  const favoritesOnly = req.query.favorites === "true";
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
  const recipes = await getRecipes(req.user!.id, favoritesOnly, search);
  return res.json({ success: true, data: { recipes } });
};

export const readRecipe = async (req: Request, res: Response) => {
  const recipeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const recipe = await getRecipe(req.user!.id, recipeId);
  if (!recipe) {
    return res.status(404).json({ success: false, message: "Recette introuvable" });
  }
  return res.json({ success: true, data: { recipe } });
};

export const generateRecipe = async (req: Request, res: Response) => {
  const validation = generateRecipeSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Données invalides",
      errors: z.treeifyError(validation.error),
    });
  }

  let quotaConsumed = false;
  try {
    quotaConsumed = await consumeDailyGeneration(req.user!.id);
    const recipe = await generateAndSaveRecipe(req.user!.id, validation.data);
    return res.status(201).json({ success: true, data: { recipe } });
  } catch (error) {
    if (quotaConsumed) {
      await refundDailyGeneration(req.user!.id);
    }

    const code = error instanceof Error ? error.message : "";
    if (code === "DAILY_QUOTA_REACHED") {
      return res.status(429).json({
        success: false,
        message: "Quota quotidien atteint",
        data: { quota: await getDailyQuota(req.user!.id) },
      });
    }
    if (code === "GEMINI_NOT_CONFIGURED") {
      return res.status(503).json({ success: false, message: "La génération IA n'est pas configurée" });
    }
    if (code === "GEMINI_TEMPORARILY_UNAVAILABLE") {
      return res.status(503).json({
        success: false,
        message: "Le service IA est temporairement indisponible. Réessayez dans quelques instants.",
      });
    }
    if (code === "GEMINI_RATE_LIMITED") {
      return res.status(429).json({
        success: false,
        message: "Le quota de génération IA est temporairement atteint. Réessayez plus tard.",
      });
    }
    console.error("Recipe generation error:", error);
    return res.status(502).json({ success: false, message: "Impossible de générer la recette" });
  }
};

export const updateFavorite = async (req: Request, res: Response) => {
  const validation = updateFavoriteSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: "Valeur de favori invalide" });
  }
  const recipeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const recipe = await setRecipeFavorite(req.user!.id, recipeId, validation.data.isFavorite);
  if (!recipe) {
    return res.status(404).json({ success: false, message: "Recette introuvable" });
  }
  return res.json({ success: true, data: { recipe } });
};

export const removeRecipe = async (req: Request, res: Response) => {
  const recipeId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = await deleteRecipe(req.user!.id, recipeId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Recette introuvable" });
  }
  return res.json({ success: true, message: "Recette supprimée" });
};
