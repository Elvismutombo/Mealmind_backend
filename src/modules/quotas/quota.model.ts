import mongoose, { Schema, Document } from "mongoose";

export interface IDailyUsage extends Document {
  userId: mongoose.Types.ObjectId;
  dateKey: string;
  generations: number;
}

const dailyUsageSchema = new Schema<IDailyUsage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dateKey: { type: String, required: true },
    generations: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

dailyUsageSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export default mongoose.model<IDailyUsage>("DailyUsage", dailyUsageSchema);
