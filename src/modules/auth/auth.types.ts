export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  isEmailVerified: boolean;
  role: "user" | "admin";
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegistrationResult {
  user: AuthUser;
  requiresEmailVerification: true;
}