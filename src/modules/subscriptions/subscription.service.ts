import mongoose from "mongoose";
import Subscription from "./subscription.model.js";

export const isPremiumActive = async (userId: string): Promise<boolean> => {
  const subscription = await Subscription.findOne({ userId, isActive: true });
  return Boolean(
    subscription &&
      (!subscription.expiresAt || subscription.expiresAt.getTime() > Date.now()),
  );
};

export const getSubscription = async (userId: string) => {
  const subscription = await Subscription.findOne({ userId }).lean();
  const isActive = Boolean(
    subscription?.isActive &&
      (!subscription.expiresAt || subscription.expiresAt.getTime() > Date.now()),
  );
  return {
    tier: isActive ? "premium" : "free",
    isActive,
    expiresAt: subscription?.expiresAt ?? null,
    productId: isActive ? subscription?.productId ?? null : null,
  };
};

export const applyRevenueCatEvent = async (event: {
  app_user_id: string;
  type: string;
  product_id?: string | null;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
}) => {
  if (!mongoose.isValidObjectId(event.app_user_id)) {
    throw new Error("INVALID_REVENUECAT_APP_USER_ID");
  }

  if (!(event.entitlement_ids ?? []).includes("premium")) return;

  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms)
    : null;
  const isActive =
    event.type !== "EXPIRATION" &&
    event.type !== "REFUND" &&
    (!expiresAt || expiresAt.getTime() > Date.now());

  await Subscription.findOneAndUpdate(
    { userId: event.app_user_id },
    {
      $set: {
        provider: "revenuecat",
        productId: event.product_id || "unknown",
        entitlementId: "premium",
        isActive,
        expiresAt,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
};
