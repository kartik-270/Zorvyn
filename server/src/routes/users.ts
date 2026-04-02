import { Router } from "express";
import bcrypt from "bcrypt";
import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { HttpError } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { createUserSchema, idParamSchema, patchPasswordSchema, patchUserSchema } from "../validation";

const router = Router();

router.use(requireAuth, requireRole(UserRole.ADMIN));

router.post("/", async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: { email: body.email, passwordHash, role: body.role, status: body.status },
      select: { id: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
    });
    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const q = listQuerySchema.parse(req.query);
    const where = q.search
      ? { email: { contains: q.search, mode: "insensitive" as const } }
      : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: { id: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
      }),
    ]);

    return res.json({ page: q.page, pageSize: q.pageSize, total, users });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = idParamSchema.parse(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new HttpError(404, "User not found", "NOT_FOUND");
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const id = idParamSchema.parse(req.params.id);
    const body = patchUserSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
    });
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id/password", async (req, res, next) => {
  try {
    const id = idParamSchema.parse(req.params.id);
    const body = patchPasswordSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;

