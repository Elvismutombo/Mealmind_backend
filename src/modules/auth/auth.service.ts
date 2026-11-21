import User from "../users/user.model.js";
import type { RegisterInput, LoginInput } from "./auth.validation.js";

import { generateAccessToken } from "../../utils/jwt.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { createRefreshSession } from "./session.service.js";

import PendingRegistration from "./pending-registration.model.js";
import {
  createPendingRegistration,
  verifyPendingRegistration,
} from "./pending-registration.service.js";
import { OAuth2Client } from "google-auth-library";
import type {
  AuthSession,
  AuthUser,
  RegistrationResult,
} from "./auth.types.js";

const googleClient = new OAuth2Client();

export const registerUser = async (
  data: RegisterInput,
): Promise<RegistrationResult> => {
  const existingUser = await User.exists({ email: data.email });

  if (existingUser) {
    throw new Error("Cette adresse e-mail est déjà utilisée");
  }

  const existingPending = await PendingRegistration.findOne({
    email: data.email,
  });
  if (existingPending && existingPending.expiresAt <= new Date()) {
    await PendingRegistration.deleteOne({ _id: existingPending._id });
  } else if (existingPending) {
    throw new Error("Cette adresse e-mail est déjà utilisée");
  }

  const passwordHash = await hashPassword(data.password);
  try {
    await createPendingRegistration({
      name: data.name,
      email: data.email,
      passwordHash,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error("Cette adresse e-mail est déjà utilisée");
    }
    throw error;
  }

  return { requiresEmailVerification: true };
};

export const verifyPendingRegistrationAndCreateSession = async (
  email: string,
  code: string,
): Promise<AuthSession> => {
  const user = await verifyPendingRegistration(email, code);
  const accessToken = generateAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  const refreshToken = await createRefreshSession(user._id);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};

export const loginUser = async (data: LoginInput): Promise<AuthSession> => {
  // Rechercher l'utilisateur et récupérer son mot de passe
  const user = await User.findOne({
    email: data.email,
  }).select("+password");

  if (!user || !user.password) {
    throw new Error("Identifiants incorrects");
  }

  // Vérifier le mot de passe
  const isPasswordValid = await comparePassword(data.password, user.password);

  if (!isPasswordValid) {
    throw new Error("Identifiants incorrects");
  }

  if (!user.isEmailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  // Générer le token
  const accessToken = generateAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  // Générer le token de rafraîchissement
  const refreshToken = await createRefreshSession(user._id);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};

export const loginWithGoogle = async (
  idToken: string,
): Promise<AuthSession> => {
  const allowedClientIds = (process.env.GOOGLE_CLIENT_IDS ?? "")
    .split(",")
    .map((clientId) => clientId.trim())
    .filter(Boolean);

  if (allowedClientIds.length === 0) {
    throw new Error("GOOGLE_AUTH_NOT_CONFIGURED");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: allowedClientIds,
  });
  const payload = ticket.getPayload();

  if (!payload?.email || !payload.email_verified || !payload.sub) {
    throw new Error("GOOGLE_IDENTITY_UNVERIFIED");
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({
    $or: [{ googleId: payload.sub }, { email }],
  });

  if (user) {
    if (user.googleId && user.googleId !== payload.sub) {
      throw new Error("GOOGLE_ACCOUNT_CONFLICT");
    }

    user.googleId = payload.sub;
    user.authProvider = "google";
    user.isEmailVerified = true;
    if (payload.name && !user.name) user.name = payload.name;
    if (payload.picture && !user.avatar) user.avatar = payload.picture;
    await user.save();
  } else {
    user = await User.create({
      name: payload.name || email.split("@")[0],
      email,
      googleId: payload.sub,
      avatar: payload.picture,
      isEmailVerified: true,
      authProvider: "google",
      password: undefined,
    });
  }

  const accessToken = generateAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  const refreshToken = await createRefreshSession(user._id);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};
