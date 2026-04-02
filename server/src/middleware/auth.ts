import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole, UserStatus } from "@prisma/client";
import { env } from "../env";
import { prisma } from "../prisma";
import { HttpError } from "../utils/httpError";

type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  if (!token) return next(new HttpError(401, "Not authenticated", "UNAUTHENTICATED"));

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return next(new HttpError(401, "Not authenticated", "UNAUTHENTICATED"));
    if (user.status !== UserStatus.ACTIVE) {
      return next(new HttpError(403, "User is inactive", "INACTIVE_USER"));
    }
    req.user = { id: user.id, email: user.email, role: user.role, status: user.status };
    return next();
  } catch {
    return next(new HttpError(401, "Invalid token", "INVALID_TOKEN"));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new HttpError(401, "Not authenticated", "UNAUTHENTICATED"));
    if (!roles.includes(user.role)) {
      return next(new HttpError(403, "Forbidden", "FORBIDDEN"));
    }
    return next();
  };
}

