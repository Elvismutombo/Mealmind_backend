import type { Request, Response } from "express";
import { z } from "zod";
import {
  addShoppingItem,
  clearCheckedItems,
  deleteShoppingItem,
  getShoppingList,
  updateShoppingItem,
} from "./shopping-list.service.js";

const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().max(60).optional().default(""),
});
const itemUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  quantity: z.string().trim().max(60).optional(),
  isChecked: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0);

export const readShoppingList = async (req: Request, res: Response) => {
  const list = await getShoppingList(req.user!.id);
  return res.json({ success: true, data: { list } });
};

export const createShoppingItem = async (req: Request, res: Response) => {
  const validation = itemSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: "Article invalide", errors: z.treeifyError(validation.error) });
  }
  const list = await addShoppingItem(req.user!.id, validation.data);
  return res.status(201).json({ success: true, data: { list } });
};

export const patchShoppingItem = async (req: Request, res: Response) => {
  const validation = itemUpdateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: "Modification invalide" });
  }
  const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const list = await updateShoppingItem(req.user!.id, itemId, validation.data);
  if (!list) return res.status(404).json({ success: false, message: "Article introuvable" });
  return res.json({ success: true, data: { list } });
};

export const removeShoppingItem = async (req: Request, res: Response) => {
  const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const deleted = await deleteShoppingItem(req.user!.id, itemId);
  if (!deleted) return res.status(404).json({ success: false, message: "Article introuvable" });
  return res.json({ success: true, message: "Article supprimé" });
};

export const removeCheckedItems = async (req: Request, res: Response) => {
  const list = await clearCheckedItems(req.user!.id);
  return res.json({ success: true, data: { list } });
};
