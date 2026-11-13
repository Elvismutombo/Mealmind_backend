export interface RecipeIngredient {
  name: string;
  quantity: string;
}

export interface GeneratedRecipe {
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
}
