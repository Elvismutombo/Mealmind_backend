import { createHash, randomInt } from "node:crypto";
import User from "../users/user.model.js";
import EmailVerification from "./email-verification.model.js";
import { sendEmail } from "../../config/email.js";

const OTP_DURATION = 10 * 60 * 1000;
const RESEND_DELAY = 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashCode = (code: string): string =>
  createHash("sha256").update(code).digest("hex");

export const sendVerificationCode = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.isEmailVerified) {
    throw new Error("EMAIL_ALREADY_VERIFIED");
  }

  let verification = await EmailVerification.findOne({ userId });

  if (
    verification &&
    Date.now() - verification.lastSentAt.getTime() < RESEND_DELAY
  ) {
    throw new Error("OTP_RESEND_TOO_SOON");
  }

  const code = randomInt(100000, 1000000).toString();
  const now = new Date();

  const codeHash = hashCode(code);

  if (verification) {
    verification.codeHash = codeHash;
    verification.expiresAt = new Date(Date.now() + OTP_DURATION);
    verification.attempts = 0;
    verification.lastSentAt = now;
    verification.verifiedAt = null;

    await verification.save();
  } else {
    await EmailVerification.create({
      userId,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_DURATION),
      attempts: 0,
      lastSentAt: now,
    });
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto">
      <h2>Bienvenue sur MealMind IA</h2>
      <p>Voici ton code de vérification :</p>
      <h1 style="letter-spacing:8px">${code}</h1>
      <p>Ce code expire dans 10 minutes.</p>
      <p>Si tu n'es pas à l'origine de cette demande, ignore cet e-mail.</p>
    </div>
  `;

  try {
    await sendEmail(
      user.email,
      "Vérification de ton adresse e-mail - MealMind IA",
      html,
    );
  } catch (error) {
    // Invalider le code si l'envoi échoue.
    await EmailVerification.deleteOne({ userId });
    throw error;
  }
};

export const verifyEmailCode = async (userId: string, code: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.isEmailVerified) {
    throw new Error("EMAIL_ALREADY_VERIFIED");
  }

  const verification = await EmailVerification.findOne({ userId });

  if (!verification) {
    throw new Error("OTP_NOT_FOUND");
  }

  if (verification.expiresAt <= new Date()) {
    await EmailVerification.deleteOne({ _id: verification._id });
    throw new Error("OTP_EXPIRED");
  }

  if (verification.attempts >= MAX_ATTEMPTS) {
    throw new Error("OTP_MAX_ATTEMPTS");
  }

  if (verification.codeHash !== hashCode(code)) {
    await EmailVerification.updateOne(
      {
        _id: verification._id,
        attempts: verification.attempts,
      },
      { $inc: { attempts: 1 } },
    );

    throw new Error("OTP_INVALID");
  }

  user.isEmailVerified = true;
  await user.save();

  await EmailVerification.deleteOne({ _id: verification._id });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
  };
};

export const verifyEmailCodeByEmail = async (email: string, code: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }
  return verifyEmailCode(user._id.toString(), code);
};
