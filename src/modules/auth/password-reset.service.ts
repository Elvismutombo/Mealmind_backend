import { createHash, randomInt } from "node:crypto";
import User from "../users/user.model.js";
import RefreshToken from "./refresh-token.model.js";
import PasswordResetCode from "./password-reset.model.js";
import { sendEmail } from "../../config/email.js";
import { hashPassword } from "../../utils/password.js";

const CODE_DURATION = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashCode = (code: string) =>
  createHash("sha256").update(code).digest("hex");

export const requestPasswordReset = async (email: string) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user?.password) return;

  const code = randomInt(100000, 1000000).toString();
  await PasswordResetCode.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        codeHash: hashCode(code),
        expiresAt: new Date(Date.now() + CODE_DURATION),
        attempts: 0,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  try {
    await sendEmail(
      user.email,
      "Réinitialisation de ton mot de passe - MealMind IA",
      `<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto"><h2>Réinitialiser ton mot de passe</h2><p>Ton code de réinitialisation :</p><h1 style="letter-spacing:8px">${code}</h1><p>Ce code expire dans 10 minutes.</p></div>`,
    );
  } catch (error) {
    await PasswordResetCode.deleteOne({ userId: user._id });
    throw error;
  }
};

export const completePasswordReset = async (
  email: string,
  code: string,
  newPassword: string,
) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user?.password) throw new Error("RESET_CODE_INVALID");

  const reset = await PasswordResetCode.findOne({ userId: user._id });
  if (!reset) throw new Error("RESET_CODE_INVALID");
  if (reset.expiresAt <= new Date()) {
    await PasswordResetCode.deleteOne({ _id: reset._id });
    throw new Error("RESET_CODE_EXPIRED");
  }
  if (reset.attempts >= MAX_ATTEMPTS) {
    throw new Error("RESET_CODE_MAX_ATTEMPTS");
  }
  if (reset.codeHash !== hashCode(code)) {
    await PasswordResetCode.updateOne(
      { _id: reset._id, attempts: reset.attempts },
      { $inc: { attempts: 1 } },
    );
    throw new Error("RESET_CODE_INVALID");
  }

  user.password = await hashPassword(newPassword);
  await user.save();
  await PasswordResetCode.deleteOne({ _id: reset._id });
  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
};
