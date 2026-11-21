import mongoose from "mongoose";
import { generateRecipeText } from "../../config/gemini.js";
import Recipe from "./recipe.model.js";
import {
  deleteRecipeImage,
  ensureRecipeImageStorageConfigured,
  findRecipeImageOnPexels,
  uploadRecipeImage,
  type RecipeImage,
} from "./recipe-image.service.js";
import { generatedRecipeSchema } from "./recipe.validation.js";
import type { GenerateRecipeInput } from "./recipe.validation.js";

export const generateAndSaveRecipe = async (
  userId: string,
  input: GenerateRecipeInput,
) => {
  const text = await generateRecipeText(
    `Create one practical recipe in French using these available ingredients: ${input.ingredients.join(", ")}.
Dietary preferences or constraints: ${input.preferences || "none"}.
Use ${input.servings} servings. Return only JSON with keys: title, description, ingredients (array of {name, quantity}), instructions (array of strings), preparationMinutes, cookingMinutes, servings, caloriesPerServing (optional).`,
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }

  const recipe = generatedRecipeSchema.parse(parsed);
  let uploadedImage: Partial<RecipeImage> = {};
  try {
    ensureRecipeImageStorageConfigured();
    const image = await findRecipeImageOnPexels(recipe.title);
    uploadedImage = await uploadRecipeImage(image);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.warn(
      "Recipe image unavailable; saving recipe without an image:",
      detail,
    );
  }

  try {
    return await Recipe.create({
      ...recipe,
      ...uploadedImage,
      userId: new mongoose.Types.ObjectId(userId),
    });
  } catch (error) {
    if (uploadedImage.imagePublicId) {
      try {
        await deleteRecipeImage(uploadedImage.imagePublicId);
      } catch (cleanupError) {
        console.error("Unused recipe image cleanup failed:", cleanupError);
      }
    }

    throw error;
  }
};

export const getRecipes = (
  userId: string,
  favoritesOnly = false,
  search = "",
) => {
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Recipe.find({
    userId,
    ...(favoritesOnly ? { isFavorite: true } : {}),
    ...(escapedSearch
      ? {
          $or: [
            { title: { $regex: escapedSearch, $options: "i" } },
            { description: { $regex: escapedSearch, $options: "i" } },
            { "ingredients.name": { $regex: escapedSearch, $options: "i" } },
          ],
        }
      : {}),
  })
    .sort({ createdAt: -1 })
    .limit(100);
};

export const getRecipe = async (userId: string, recipeId: string) => {
  if (!mongoose.isValidObjectId(recipeId)) return null;
  return Recipe.findOne({ _id: recipeId, userId });
};

export const setRecipeFavorite = (userId: string, recipeId: string, isFavorite: boolean) => {
  if (!mongoose.isValidObjectId(recipeId)) return null;
  return Recipe.findOneAndUpdate(
    { _id: recipeId, userId },
    { $set: { isFavorite } },
    { returnDocument: "after", runValidators: true },
  );
};

export const deleteRecipe = async (userId: string, recipeId: string) => {
  if (!mongoose.isValidObjectId(recipeId)) return false;
  const recipe = await Recipe.findOneAndDelete({ _id: recipeId, userId });
  if (!recipe) return false;

  if (recipe.imagePublicId) {
    try {
      await deleteRecipeImage(recipe.imagePublicId);
    } catch (error) {
      console.error("Deleted recipe image cleanup failed:", error);
    }
  }

  return true;
};
