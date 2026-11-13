import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  provider: "revenuecat";
  productId: string;
  entitlementId: string;
  isActive: boolean;
  expiresAt: Date | null;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    provider: { type: String, enum: ["revenuecat"], required: true },
    productId: { type: String, required: true },
    entitlementId: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model<ISubscription>("Subscription", subscriptionSchema);
