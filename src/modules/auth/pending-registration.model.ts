import mongoose, { Document, Schema } from "mongoose";

export interface IPendingRegistration extends Document {
  name: string;
  email: string;
  passwordHash: string;
  otpHash: string;
  expiresAt: Date;
  createdAt: Date;
  attempts: number;
  lastSentAt: Date;
}

const pendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    attempts: { type: Number, required: true, default: 0 },
    lastSentAt: { type: Date, required: true },
  },
  { collection: "pending_registrations", versionKey: false },
);

pendingRegistrationSchema.index({ email: 1 }, { unique: true });
pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PendingRegistration = mongoose.model<IPendingRegistration>(
  "PendingRegistration",
  pendingRegistrationSchema,
);

export default PendingRegistration;
