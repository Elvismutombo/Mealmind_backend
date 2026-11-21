import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface User {
      id: string;
      [key: string]: unknown;
    }

    interface Request {
      user?: User | JwtPayload;
    }
  }
}

export {};
