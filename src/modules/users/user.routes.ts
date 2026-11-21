import { Router } from "express";

import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
} from "./user.controller.js";

import { uploadAvatar as uploadAvatarMiddleware } from "../../middlewares/upload.middleware.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

// Toutes les routes nécessitent une authentification.
router.use(protect);

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.patch("/change-password", changePassword);
router.post("/avatar", uploadAvatarMiddleware, uploadAvatar);

export default router;
