import User from "./user.model.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import type {
  UpdateProfileInput,
  ChangePasswordInput,
} from "./user.validation.js";

import cloudinary from "../../config/cloudinary.js";
import type { UploadApiResponse } from "cloudinary";

export const getUserProfile = async (userId: string) => {
  const user = await User.findById(userId).select(
    "name email avatar isEmailVerified authProvider role createdAt",
  );

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return user;
};

export const updateUserProfile = async (
  userId: string,
  data: UpdateProfileInput,
) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: data },
    { returnDocument: "after", runValidators: true },
  ).select("name email avatar isEmailVerified authProvider role createdAt");

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return user;
};

export const changeUserPassword = async (
  userId: string,
  data: ChangePasswordInput,
) => {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.password) {
    throw new Error("PASSWORD_NOT_AVAILABLE");
  }

  const isPasswordValid = await comparePassword(
    data.currentPassword,
    user.password,
  );

  if (!isPasswordValid) {
    throw new Error("CURRENT_PASSWORD_INCORRECT");
  }

  user.password = await hashPassword(data.newPassword);
  await user.save();

  return true;
};


const uploadToCloudinary = (buffer: Buffer): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "mealmind/avatars",
        resource_type: "image",
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("CLOUDINARY_UPLOAD_FAILED"));
          return;
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });
};

export const uploadUserAvatar = async (
  userId: string,
  file: Express.Multer.File,
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const uploadedImage = await uploadToCloudinary(file.buffer);

  try {
    const oldPublicId = user.avatarPublicId;

    user.avatar = uploadedImage.secure_url;
    user.avatarPublicId = uploadedImage.public_id;

    await user.save();

    // Supprimer l'ancien avatar uniquement après la sauvegarde réussie.
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (error) {
        console.error("Old avatar deletion failed:", error);
      }
    }

    return {
      avatar: user.avatar,
      avatarPublicId: user.avatarPublicId,
    };
  } catch (error) {
    // Éviter de conserver une image inutilisée si la sauvegarde échoue.
    await cloudinary.uploader
      .destroy(uploadedImage.public_id)
      .catch((cleanupError) => {
        console.error("Cloudinary cleanup failed:", cleanupError);
      });

    throw error;
  }
};
