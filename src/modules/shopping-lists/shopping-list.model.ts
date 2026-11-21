import mongoose, { Schema, Document } from "mongoose";

export interface IShoppingItem {
  _id: mongoose.Types.ObjectId;
  name: string;
  quantity: string;
  isChecked: boolean;
}

export interface IShoppingList extends Document {
  userId: mongoose.Types.ObjectId;
  items: IShoppingItem[];
}

const shoppingListSchema = new Schema<IShoppingList>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [
      {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        quantity: { type: String, default: "", maxlength: 60 },
        isChecked: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model<IShoppingList>("ShoppingList", shoppingListSchema);
