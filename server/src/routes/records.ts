import { Router } from "express";
import { Prisma, RecordType, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { HttpError } from "../utils/httpError";
import { requireAuth, requireRole } from "../middleware/auth";
import { createRecordSchema, idParamSchema, patchRecordSchema } from "../validation";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const body = createRecordSchema.parse(req.body);
    const record = await prisma.financialRecord.create({
      data: {
        amount: new Prisma.Decimal(body.amount),
        type: body.type,
        category: body.category,
        occurredAt: body.occurredAt,
        notes: body.notes,
        createdByUserId: req.user!.id,
      },
    });
    return res.status(201).json({ record });
  } catch (err) {
    return next(err);
  }
});

const listQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  type: z.nativeEnum(RecordType).optional(),
  category: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  search: z.string().optional(),
  sort: z.enum(["occurredAt:desc", "occurredAt:asc", "amount:desc", "amount:asc"]).default("occurredAt:desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

router.get("/", async (req, res, next) => {
  try {
    const q = listQuerySchema.parse(req.query);

    const where: Prisma.FinancialRecordWhereInput = {
      deletedAt: null,
      ...(q.type ? { type: q.type } : {}),
      ...(q.category ? { category: { equals: q.category, mode: "insensitive" } } : {}),
      ...(q.from || q.to
        ? {
            occurredAt: {
              ...(q.from ? { gte: q.from } : {}),
              ...(q.to ? { lte: q.to } : {}),
            },
          }
        : {}),
      ...(q.minAmount != null || q.maxAmount != null
        ? {
            amount: {
              ...(q.minAmount != null ? { gte: new Prisma.Decimal(q.minAmount) } : {}),
              ...(q.maxAmount != null ? { lte: new Prisma.Decimal(q.maxAmount) } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { category: { contains: q.search, mode: "insensitive" } },
              { notes: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.FinancialRecordOrderByWithRelationInput = (() => {
      const [field, dir] = q.sort.split(":") as ["occurredAt" | "amount", "asc" | "desc"];
      return { [field]: dir };
    })();

    const [total, records] = await Promise.all([
      prisma.financialRecord.count({ where }),
      prisma.financialRecord.findMany({
        where,
        orderBy,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);

    return res.json({ page: q.page, pageSize: q.pageSize, total, records });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = idParamSchema.parse(req.params.id);
    const record = await prisma.financialRecord.findFirst({ where: { id, deletedAt: null } });
    if (!record) throw new HttpError(404, "Record not found", "NOT_FOUND");
    return res.json({ record });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id", requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const id = idParamSchema.parse(req.params.id);
    const body = patchRecordSchema.parse(req.body);

    const record = await prisma.financialRecord.update({
      where: { id },
      data: {
        ...(body.amount != null ? { amount: new Prisma.Decimal(body.amount) } : {}),
        ...(body.type ? { type: body.type } : {}),
        ...(body.category ? { category: body.category } : {}),
        ...(body.occurredAt ? { occurredAt: body.occurredAt } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    return res.json({ record });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const id = idParamSchema.parse(req.params.id);
    await prisma.financialRecord.update({ where: { id }, data: { deletedAt: new Date() } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;

