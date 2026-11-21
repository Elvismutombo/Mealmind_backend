import mongoose from "mongoose";
import DailyUsage from "./quota.model.js";
import { isPremiumActive } from "../subscriptions/subscription.service.js";

const configuredLimit = Number(process.env.FREE_DAILY_RECIPE_LIMIT || 5);
const FREE_DAILY_LIMIT =
  Number.isInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 5;

const currentDateKey = () => new Date().toISOString().slice(0, 10);

export const getDailyQuota = async (userId: string) => {
  if (await isPremiumActive(userId)) {
    return { tier: "premium", used: 0, limit: null, remaining: null };
  }

  const usage = await DailyUsage.findOne({ userId, dateKey: currentDateKey() }).lean();
  const used = usage?.generations ?? 0;
  return {
    tier: "free",
    used,
    limit: FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - used),
  };
};

export const consumeDailyGeneration = async (
  userId: string,
): Promise<boolean> => {
  if (await isPremiumActive(userId)) return false;

  const dateKey = currentDateKey();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  let usage = await DailyUsage.findOne({ userId: userObjectId, dateKey });

  if (!usage) {
    try {
      usage = await DailyUsage.create({ userId: userObjectId, dateKey, generations: 0 });
    } catch (error) {
      if (!(error instanceof mongoose.mongo.MongoServerError) || error.code !== 11000) {
        throw error;
      }
    }
  }

  const result = await DailyUsage.updateOne(
    {
      userId: userObjectId,
      dateKey,
      generations: { $lt: FREE_DAILY_LIMIT },
    },
    { $inc: { generations: 1 } },
  );

  if (result.modifiedCount !== 1) {
    throw new Error("DAILY_QUOTA_REACHED");
  }
  return true;
};

export const refundDailyGeneration = async (userId: string) => {
  await DailyUsage.updateOne(
    {
      userId,
      dateKey: currentDateKey(),
      generations: { $gt: 0 },
    },
    { $inc: { generations: -1 } },
  );
};
