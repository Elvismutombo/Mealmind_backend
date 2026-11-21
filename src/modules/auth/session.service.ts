import { createHash, randomBytes, randomUUID } from "node:crypto";
import mongoose from "mongoose";

import RefreshToken from "./refresh-token.model.js";
import User from "../users/user.model.js";
import { generateAccessToken } from "../../utils/jwt.js";

const REFRESH_TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000;

const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

const generateRefreshToken = (): string => {
  return randomBytes(64).toString("hex");
};

export const createRefreshSession = async (userId: mongoose.Types.ObjectId) => {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  await RefreshToken.create({
    userId,
    tokenHash,
    familyId: randomUUID(),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_DURATION),
  });

  return refreshToken;
};

export const rotateRefreshSession = async (oldRefreshToken: string) => {
  const oldHash = hashToken(oldRefreshToken);

  const oldSession = await RefreshToken.findOne({
    tokenHash: oldHash,
  });

  if (!oldSession) {
    throw new Error("REFRESH_TOKEN_INVALID");
  }

  // Un ancien token réutilisé indique potentiellement un vol.
  if (oldSession.revokedAt) {
    await RefreshToken.updateMany(
      { familyId: oldSession.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    throw new Error("REFRESH_TOKEN_REUSED");
  }

  if (oldSession.expiresAt <= new Date()) {
    await RefreshToken.updateOne(
      { _id: oldSession._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    throw new Error("REFRESH_TOKEN_EXPIRED");
  }

  const user = await User.findById(oldSession.userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const newRefreshToken = generateRefreshToken();
  const newHash = hashToken(newRefreshToken);

  // Créer le nouveau token dans la même famille.
  const newSession = await RefreshToken.create({
    userId: user._id,
    tokenHash: newHash,
    familyId: oldSession.familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_DURATION),
  });

  // Révoquer l'ancien token de façon atomique.
  const updateResult = await RefreshToken.updateOne(
    {
      _id: oldSession._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        revokedAt: new Date(),
        replacedByTokenHash: newHash,
      },
    },
  );

  if (updateResult.modifiedCount !== 1) {
    await RefreshToken.deleteOne({ _id: newSession._id });

    await RefreshToken.updateMany(
      { familyId: oldSession.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    throw new Error("REFRESH_TOKEN_REUSED");
  }

  const accessToken = generateAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

export const revokeRefreshSession = async (
  refreshToken: string,
): Promise<void> => {
  const tokenHash = hashToken(refreshToken);

  await RefreshToken.updateOne(
    {
      tokenHash,
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    },
  );
};
