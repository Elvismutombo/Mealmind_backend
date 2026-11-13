import { Router } from "express";

import {
  register,
  login,
  googleLogin,
  refresh,
  logout,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  resetPassword,
} from "./auth.controller.js";
import rateLimit from "express-rate-limit";

const router = Router();
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de demandes. Réessaie dans quelques minutes.",
  },
});
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.post("/register", authAttemptLimiter, register);
router.post("/login", authAttemptLimiter, login);
router.post("/google", authAttemptLimiter, googleLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/verify-email", authAttemptLimiter, verifyEmail);
router.post("/resend-verification", authAttemptLimiter, resendVerificationCode);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);

export default router;
