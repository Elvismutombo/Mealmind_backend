import type { Request, Response } from "express";
import { registerSchema, loginSchema } from "./auth.validation.js";

import {
  registerUser,
  loginUser,
  loginWithGoogle,
  verifyPendingRegistrationAndCreateSession,
} from "./auth.service.js";
import {
  rotateRefreshSession,
  revokeRefreshSession,
} from "./session.service.js";

import {
  sendVerificationCode,
  verifyEmailCode,
} from "./email-verification.service.js";
import { resendPendingRegistrationCode } from "./pending-registration.service.js";

import { z } from "zod";
import User from "../users/user.model.js";
import {
  completePasswordReset,
  requestPasswordReset,
} from "./password-reset.service.js";

export const register = async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const result = await registerUser(validation.data);

    return res.status(201).json({
      success: true,
      message: "Compte créé avec succès",
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne";

    if (message === "Cette adresse e-mail est déjà utilisée") {
      return res.status(409).json({
        success: false,
        message,
      });
    }

    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'inscription",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const result = await loginUser(validation.data);

    return res.status(200).json({
      success: true,
      message: "Connexion réussie",
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne";

    if (message === "Identifiants incorrects") {
      return res.status(401).json({
        success: false,
        message,
      });
    }

    if (message === "EMAIL_NOT_VERIFIED") {
      return res.status(403).json({
        success: false,
        message:
          "Veuillez vérifier votre adresse e-mail avant de vous connecter",
      });
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la connexion",
    });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  const validation = z.object({ idToken: z.string().min(1) }).safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Jeton Google invalide",
    });
  }

  try {
    const result = await loginWithGoogle(validation.data.idToken);
    return res.status(200).json({
      success: true,
      message: "Connexion Google réussie",
      data: result,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (code === "GOOGLE_AUTH_NOT_CONFIGURED") {
      return res.status(503).json({
        success: false,
        message: "La connexion Google n'est pas configurée sur le serveur",
      });
    }

    if (
      code === "GOOGLE_IDENTITY_UNVERIFIED" ||
      code === "GOOGLE_ACCOUNT_CONFLICT"
    ) {
      return res.status(401).json({
        success: false,
        message: "Impossible de vérifier ce compte Google",
      });
    }

    console.error("Google login error:", error);
    return res.status(401).json({
      success: false,
      message: "La connexion Google a échoué",
    });
  }
};


export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body?.refreshToken;

    if (
      typeof refreshToken !== "string" ||
      refreshToken.length === 0 ||
      refreshToken.length > 512
    ) {
      return res.status(400).json({
        success: false,
        message: "Refresh token invalide",
      });
    }

    const result = await rotateRefreshSession(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Session renouvelée",
      data: result,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (
      code === "REFRESH_TOKEN_INVALID" ||
      code === "REFRESH_TOKEN_EXPIRED" ||
      code === "REFRESH_TOKEN_REUSED"
    ) {
      return res.status(401).json({
        success: false,
        message: "Session invalide ou expirée. Veuillez vous reconnecter.",
      });
    }

    if (code === "USER_NOT_FOUND") {
      return res.status(401).json({
        success: false,
        message: "Utilisateur introuvable",
      });
    }

    console.error("Refresh error:", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de renouveler la session",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body?.refreshToken;

    if (
      typeof refreshToken !== "string" ||
      refreshToken.length === 0 ||
      refreshToken.length > 512
    ) {
      return res.status(400).json({
        success: false,
        message: "Refresh token invalide",
      });
    }

    await revokeRefreshSession(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Déconnexion réussie",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Impossible de terminer la session",
    });
  }
};


const verifyOtpSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  code: z.string().regex(/^\d{6}$/),
}).refine((value) => Boolean(value.userId || value.email));

const resendOtpSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
});

export const verifyEmail = async (req: Request, res: Response) => {
  const validation = verifyOtpSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Identifiant ou code invalide",
    });
  }

  try {
    const result = validation.data.email
      ? await verifyPendingRegistrationAndCreateSession(
          validation.data.email,
          validation.data.code,
        )
      : await verifyEmailCode(
          validation.data.userId!,
          validation.data.code,
        );

    return res.status(200).json({
      success: true,
      message: "Adresse e-mail vérifiée avec succès",
      data: result,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    const messages: Record<string, string> = {
      USER_NOT_FOUND: "Utilisateur introuvable",
      PENDING_REGISTRATION_NOT_FOUND:
        "Aucune inscription en attente pour cette adresse",
      EMAIL_ALREADY_VERIFIED: "Cette adresse est déjà vérifiée",
      OTP_NOT_FOUND: "Aucun code actif. Demande un nouveau code",
      OTP_EXPIRED: "Le code a expiré",
      OTP_MAX_ATTEMPTS: "Nombre maximal de tentatives atteint",
      OTP_INVALID: "Code incorrect",
    };

    if (messages[code]) {
      return res.status(code === "USER_NOT_FOUND" ? 404 : 400).json({
        success: false,
        message: messages[code],
      });
    }

    console.error("Email verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification",
    });
  }
};

export const resendVerificationCode = async (req: Request, res: Response) => {
  const validation = resendOtpSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Adresse e-mail invalide",
    });
  }

  try {
    const sentForPending = await resendPendingRegistrationCode(
      validation.data.email,
    );
    if (sentForPending) {
      return res.status(200).json({
        success: true,
        message:
          "Si le compte existe et nécessite une vérification, un code sera envoyé.",
      });
    }

    const user = await User.findOne({
      email: validation.data.email,
    });

    // Réponse générique pour ne pas révéler les comptes existants.
    if (!user || user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message:
          "Si le compte existe et nécessite une vérification, un code sera envoyé.",
      });
    }

    await sendVerificationCode(user._id.toString());

    return res.status(200).json({
      success: true,
      message: "Un nouveau code a été envoyé",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (code === "OTP_RESEND_TOO_SOON") {
      return res.status(429).json({
        success: false,
        message: "Attends 60 secondes avant de demander un nouveau code",
      });
    }

    console.error("Resend OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Impossible d'envoyer le code",
    });
  }
};

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

const resetPasswordSchema = forgotPasswordSchema.extend({
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(128),
});

export const forgotPassword = async (req: Request, res: Response) => {
  const validation = forgotPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: "Adresse e-mail invalide" });
  }

  try {
    await requestPasswordReset(validation.data.email);
    return res.status(200).json({
      success: true,
      message: "Si le compte existe, un code de réinitialisation a été envoyé.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({
      success: false,
      message: "Impossible d'envoyer le code de réinitialisation",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const validation = resetPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: "Données invalides" });
  }

  try {
    await completePasswordReset(
      validation.data.email,
      validation.data.code,
      validation.data.newPassword,
    );
    return res.status(200).json({
      success: true,
      message: "Mot de passe modifié. Reconnecte-toi avec ton nouveau mot de passe.",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      RESET_CODE_INVALID: "Code de réinitialisation incorrect",
      RESET_CODE_EXPIRED: "Le code de réinitialisation a expiré",
      RESET_CODE_MAX_ATTEMPTS: "Nombre maximal de tentatives atteint",
    };
    if (messages[code]) {
      return res.status(400).json({ success: false, message: messages[code] });
    }

    console.error("Password reset error:", error);
    return res.status(500).json({
      success: false,
      message: "Impossible de réinitialiser le mot de passe",
    });
  }
};
