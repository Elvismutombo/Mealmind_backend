import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;

  // Image de profil stockée sur Cloudinary
  avatar?: string | null;
  avatarPublicId?: string | null;

  isEmailVerified: boolean;
  authProvider: "local" | "google";
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      minlength: 8,
      select: false,
    },

    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },

    avatar: {
      type: String,
      default: null,
    },

    avatarPublicId: {
      type: String,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
