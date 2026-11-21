import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import recipeRoutes from "../modules/recipes/recipe.routes.js";
import shoppingListRoutes from "../modules/shopping-lists/shopping-list.routes.js";
import quotaRoutes from "../modules/quotas/quota.routes.js";
import subscriptionRoutes from "../modules/subscriptions/subscription.routes.js";

const router = Router();

// Authentification
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/recipes", recipeRoutes);
router.use("/shopping-lists", shoppingListRoutes);
router.use("/quotas", quotaRoutes);
router.use("/subscriptions", subscriptionRoutes);

// Les autres modules seront ajoutés progressivement :
// router.use("/users", userRoutes);
// router.use("/recipes", recipeRoutes);
// router.use("/shopping-lists", shoppingListRoutes);

export default router;
