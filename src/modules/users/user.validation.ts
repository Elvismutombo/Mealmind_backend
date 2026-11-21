import { z } from "zod";

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
  })
  .refine((data) => data.name !== undefined, {
    message: "Aucune donnée à modifier",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Le nouveau mot de passe doit être différent de l'ancien",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
