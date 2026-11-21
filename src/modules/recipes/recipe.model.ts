import mongoose, { Schema, Document } from "mongoose";
import type { RecipeIngredient } from "./recipe.types.js";

export interface IRecipe extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  preparationMinutes: number;
  cookingMinutes: number;
  servings: number;
  caloriesPerServing?: number;
  imageUrl?: string;
  imagePublicId?: string;
  imagePhotographer?: string;
  imageSourceUrl?: string;
  isFavorite: boolean;
}

const recipeSchema = new Schema<IRecipe>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 500 },
    ingredients: {
      type: [{ name: { type: String, required: true }, quantity: { type: String, required: true } }],
      required: true,
    },
    instructions: { type: [String], required: true },
    preparationMinutes: { type: Number, required: true, min: 0 },
    cookingMinutes: { type: Number, required: true, min: 0 },
    servings: { type: Number, required: true, min: 1 },
    caloriesPerServing: { type: Number, min: 0 },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    imagePhotographer: { type: String },
    imageSourceUrl: { type: String },
    isFavorite: { type: Boolean, default: false },
  },
  { timestamps: true },
);

recipeSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IRecipe>("Recipe", recipeSchema);
