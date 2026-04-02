import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { env } from "../env";
import { HttpError } from "../utils/httpError";
import { requireAuth } from "../middleware/auth";
import { loginSchema } from "../validation";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");

    if (user.status !== "ACTIVE") throw new HttpError(403, "User is inactive", "INACTIVE_USER");

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      accessToken: token,
      user: { id: user.id, email: user.email, role: user.role, status: user.status },
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

export default router;

