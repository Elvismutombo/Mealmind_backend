import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  createShoppingItem,
  patchShoppingItem,
  readShoppingList,
  removeCheckedItems,
  removeShoppingItem,
} from "./shopping-list.controller.js";

const router = Router();
router.use(protect);
router.get("/", readShoppingList);
router.post("/items", createShoppingItem);
router.delete("/items/checked", removeCheckedItems);
router.patch("/items/:itemId", patchShoppingItem);
router.delete("/items/:itemId", removeShoppingItem);

export default router;
