import multer from "multer";
import type { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (req, file, callback) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.mimetype)) {
    callback(new Error("INVALID_IMAGE_FORMAT"));
    return;
  }

  callback(null, true);
};

const parseAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Mo maximum
    files: 1,
  },
}).single("avatar");

export const uploadAvatar = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  parseAvatar(req, res, (error?: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      res.status(tooLarge ? 413 : 400).json({
        success: false,
        message: tooLarge
          ? "La photo ne peut pas dépasser 5 Mo"
          : "Fichier image invalide",
      });
      return;
    }

    if (error instanceof Error && error.message === "INVALID_IMAGE_FORMAT") {
      res.status(400).json({
        success: false,
        message: "Format accepté : JPEG, PNG ou WEBP",
      });
      return;
    }

    next(error);
  });
};
