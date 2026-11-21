import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { sendEmail } from "../../config/email.js";
import User from "../users/user.model.js";
import PendingRegistration from "./pending-registration.model.js";

const REGISTRATION_DURATION = 15 * 60 * 1000;
const RESEND_DELAY = 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashCode = (code: string): string =>
  createHash("sha256").update(code).digest("hex");

const codeMatches = (code: string, storedHash: string): boolean => {
  const candidate = Buffer.from(hashCode(code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
};

const sendRegistrationCode = async (email: string, code: string) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
      <h2>Bienvenue sur MealMind IA</h2>
      <p>Saisis ce code pour créer ton compte :</p>
      <h1 style="letter-spacing:8px">${code}</h1>
      <p>Ce code expire dans 15 minutes.</p>
      <p>Si tu n'es pas à l'origine de cette demande, ignore cet e-mail.</p>
    </div>
  `;

  await sendEmail(
    email,
    "Vérification de ton adresse e-mail - MealMind IA",
    html,
  );
};

export const createPendingRegistration = async (data: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<void> => {
  const code = randomInt(100000, 1000000).toString();
  const now = new Date();
  const pending = await PendingRegistration.create({
    ...data,
    otpHash: hashCode(code),
    expiresAt: new Date(now.getTime() + REGISTRATION_DURATION),
    createdAt: now,
    attempts: 0,
    lastSentAt: now,
  });

  try {
    await sendRegistrationCode(data.email, code);
  } catch (error) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw error;
  }
};

export const resendPendingRegistrationCode = async (
  email: string,
): Promise<boolean> => {
  const pending = await PendingRegistration.findOne({ email });
  if (!pending) return false;

  const now = new Date();
  if (pending.expiresAt <= now) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    return false;
  }
  if (now.getTime() - pending.lastSentAt.getTime() < RESEND_DELAY) {
    throw new Error("OTP_RESEND_TOO_SOON");
  }

  const code = randomInt(100000, 1000000).toString();
  pending.otpHash = hashCode(code);
  pending.expiresAt = new Date(now.getTime() + REGISTRATION_DURATION);
  pending.attempts = 0;
  pending.lastSentAt = now;
  await pending.save();

  try {
    await sendRegistrationCode(email, code);
  } catch (error) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw error;
  }

  return true;
};

export const verifyPendingRegistration = async (
  email: string,
  code: string,
) => {
  const pending = await PendingRegistration.findOne({ email }).select(
    "+passwordHash",
  );
  if (!pending) throw new Error("PENDING_REGISTRATION_NOT_FOUND");

  const now = new Date();
  if (pending.expiresAt <= now) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw new Error("OTP_EXPIRED");
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    throw new Error("OTP_MAX_ATTEMPTS");
  }
  if (!codeMatches(code, pending.otpHash)) {
    await PendingRegistration.updateOne(
      { _id: pending._id, attempts: pending.attempts },
      { $inc: { attempts: 1 } },
    );
    throw new Error("OTP_INVALID");
  }

  const user = await User.create({
    name: pending.name,
    email: pending.email,
    password: pending.passwordHash,
    isEmailVerified: true,
    authProvider: "local",
  });

  await PendingRegistration.deleteOne({ _id: pending._id });
  return user;
};

export const cleanupExpiredPendingRegistrations = async (): Promise<number> => {
  const result = await PendingRegistration.deleteMany({
    expiresAt: { $lte: new Date() },
  });
  return result.deletedCount;
};
