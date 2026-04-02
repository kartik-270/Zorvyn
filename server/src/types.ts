import type { UserRole, UserStatus } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Request {
      user?: AuthUser;
    }
  }
}

