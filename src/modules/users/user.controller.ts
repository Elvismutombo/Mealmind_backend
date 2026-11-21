import type { Request, Response } from "express";
import { z } from "zod";

import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  uploadUserAvatar,
} from "./user.service.js";

import {
  updateProfileSchema,
  changePasswordSchema,
} from "./user.validation.js";

export const getProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = await getUserProfile(req.user!.id);

    res.status(200).json({
      success: true,
      message: "Profil récupéré avec succès",
      data: user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
      return;
    }

    console.error("Get profile error:", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du profil",
    });
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const validation = updateProfileSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Données invalides",
      errors: z.treeifyError(validation.error),
    });
    return;
  }

  try {
    const user = await updateUserProfile(req.user!.id, validation.data);

    res.status(200).json({
      success: true,
      message: "Profil mis à jour avec succès",
      data: user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
      return;
    }

    console.error("Update profile error:", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de la modification du profil",
    });
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const validation = changePasswordSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      message: "Données invalides",
      errors: z.treeifyError(validation.error),
    });
    return;
  }

  try {
    await changeUserPassword(req.user!.id, validation.data);

    res.status(200).json({
      success: true,
      message: "Mot de passe modifié avec succès",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "USER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
      return;
    }

    if (message === "PASSWORD_NOT_AVAILABLE") {
      res.status(400).json({
        success: false,
        message: "Ce compte utilise une authentification Google",
      });
      return;
    }

    if (message === "CURRENT_PASSWORD_INCORRECT") {
      res.status(400).json({
        success: false,
        message: "Le mot de passe actuel est incorrect",
      });
      return;
    }

    console.error("Change password error:", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors du changement de mot de passe",
    });
  }
};


export const uploadAvatar = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: "Veuillez sélectionner une image",
    });
    return;
  }

  try {
    const result = await uploadUserAvatar(req.user!.id, req.file);

    res.status(200).json({
      success: true,
      message: "Photo de profil mise à jour avec succès",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Utilisateur introuvable",
      });
      return;
    }

    console.error("Avatar upload error:", error);

    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi de la photo",
    });
  }
};
