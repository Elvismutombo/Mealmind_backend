import type { Request, Response } from "express";
import { z } from "zod";

import { errorResponse, successResponse } from "../../utils/api-response.js";
import {
  getExternalMeal,
  getExternalMealCategories,
  searchExternalMeals,
} from "./external-meals.service.js";

const searchSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    area: z.string().trim().max(80).optional(),
    ingredient: z.string().trim().max(80).optional(),
  })
  .refine(
    (query) =>
      [query.q, query.category, query.area, query.ingredient].filter(
        (value) => value != null && value.length > 0,
      ).length <= 1,
  );

const sendServiceError = (res: Response, error: unknown) => {
  if (error instanceof Error && error.message === "MEAL_NOT_FOUND") {
    return res.status(404).json(errorResponse("Recette introuvable."));
  }
  if (
    error instanceof Error &&
    error.message === "MEAL_TRANSLATION_NOT_CONFIGURED"
  ) {
    return res.status(503).json(
      errorResponse(
        "La traduction des recettes n’est pas configurée sur le serveur.",
      ),
    );
  }

  console.error("External meals service error:", error);
  return res
    .status(502)
    .json(errorResponse("Le service de recettes est momentanément indisponible."));
};

export const searchMeals = async (req: Request, res: Response) => {
  const validation = searchSchema.safeParse(req.query);
  if (!validation.success) {
    return res
      .status(400)
      .json(errorResponse("Un seul filtre de recherche peut être utilisé."));
  }

  try {
    const meals = await searchExternalMeals({
      query: validation.data.q,
      category: validation.data.category,
      area: validation.data.area,
      ingredient: validation.data.ingredient,
    });
    return res
      .status(200)
      .json(successResponse("Recettes chargées.", meals));
  } catch (error) {
    return sendServiceError(res, error);
  }
};

export const mealCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await getExternalMealCategories();
    return res
      .status(200)
      .json(successResponse("Catégories chargées.", categories));
  } catch (error) {
    return sendServiceError(res, error);
  }
};

export const mealLookup = async (req: Request, res: Response) => {
  const id = z.string().regex(/^\d{1,20}$/).safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json(errorResponse("Identifiant de recette invalide."));
  }

  try {
    const meal = await getExternalMeal(id.data);
    return res.status(200).json(successResponse("Recette chargée.", meal));
  } catch (error) {
    return sendServiceError(res, error);
  }
};
