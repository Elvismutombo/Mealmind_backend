import mongoose from "mongoose";
import ShoppingList from "./shopping-list.model.js";

export const getShoppingList = async (userId: string) => {
  let list = await ShoppingList.findOne({ userId });
  if (!list) {
    try {
      list = await ShoppingList.create({ userId, items: [] });
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== 11000
      ) {
        throw error;
      }

      list = await ShoppingList.findOne({ userId });
      if (!list) throw error;
    }
  }
  return list;
};

export const addShoppingItem = async (
  userId: string,
  item: { name: string; quantity: string },
) => {
  const list = await getShoppingList(userId);
  list.items.push({
    _id: new mongoose.Types.ObjectId(),
    ...item,
    isChecked: false,
  });
  await list.save();
  return list;
};

export const updateShoppingItem = async (
  userId: string,
  itemId: string,
  update: { name?: string; quantity?: string; isChecked?: boolean },
) => {
  if (!mongoose.isValidObjectId(itemId)) return null;
  const list = await ShoppingList.findOne({ userId });
  const item = list?.items.find((entry) => entry._id.toString() === itemId);
  if (!list || !item) return null;
  Object.assign(item, update);
  await list.save();
  return list;
};

export const deleteShoppingItem = async (userId: string, itemId: string) => {
  if (!mongoose.isValidObjectId(itemId)) return false;
  const list = await ShoppingList.findOne({ userId });
  if (!list?.items.some((entry) => entry._id.toString() === itemId)) return false;
  list.items = list.items.filter((entry) => entry._id.toString() !== itemId);
  await list.save();
  return true;
};

export const clearCheckedItems = async (userId: string) => {
  const list = await ShoppingList.findOne({ userId });
  if (!list) return [];
  list.items = list.items.filter((item) => !item.isChecked);
  await list.save();
  return list;
};
