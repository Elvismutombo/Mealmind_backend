import { z } from "zod";

export const generateRecipeSchema = z.object({
  ingredients: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  preferences: z.string().trim().max(500).optional().default(""),
  servings: z.number().int().min(1).max(12).default(2),
});

export const generatedRecipeSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(500),
  ingredients: z.array(
    z.object({
      name: z.string().min(1).max(100),
      quantity: z.string().min(1).max(60),
    }),
  ).min(1).max(40),
  instructions: z.array(z.string().min(1).max(1000)).min(1).max(30),
  preparationMinutes: z.number().int().min(0).max(600),
  cookingMinutes: z.number().int().min(0).max(600),
  servings: z.number().int().min(1).max(12),
  caloriesPerServing: z.number().int().min(0).max(10000).optional(),
});

export const updateFavoriteSchema = z.object({
  isFavorite: z.boolean(),
});

export type GenerateRecipeInput = z.infer<typeof generateRecipeSchema>;
