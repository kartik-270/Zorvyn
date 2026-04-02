import { Router } from "express";
import { Prisma, RecordType, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const rangeWithSearchSchema = rangeSchema.extend({
  search: z.string().optional(),
});

function occurredWhere(q: { from?: Date; to?: Date }) {
  return q.from || q.to
    ? {
        occurredAt: {
          ...(q.from ? { gte: q.from } : {}),
          ...(q.to ? { lte: q.to } : {}),
        },
      }
    : {};
}

router.get("/summary", async (req, res, next) => {
  try {
    const q = rangeSchema.parse(req.query);
    const whereBase: Prisma.FinancialRecordWhereInput = { deletedAt: null, ...occurredWhere(q) };

    const [incomeAgg, expenseAgg, recent] = await Promise.all([
      prisma.financialRecord.aggregate({
        where: { ...whereBase, type: RecordType.INCOME },
        _sum: { amount: true },
      }),
      prisma.financialRecord.aggregate({
        where: { ...whereBase, type: RecordType.EXPENSE },
        _sum: { amount: true },
      }),
      prisma.financialRecord.findMany({
        where: whereBase,
        orderBy: { occurredAt: "desc" },
        take: 10,
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
    const totalExpense = expenseAgg._sum.amount ?? new Prisma.Decimal(0);
    const netBalance = totalIncome.sub(totalExpense);

    return res.json({
      totalIncome,
      totalExpense,
      netBalance,
      recentActivity: recent,
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/categories", requireRole(UserRole.ANALYST, UserRole.ADMIN), async (req, res, next) => {
  try {
    const q = rangeWithSearchSchema.parse(req.query);
    const whereBase: Prisma.FinancialRecordWhereInput = {
      deletedAt: null,
      ...occurredWhere(q),
      ...(q.search?.trim()
        ? { category: { contains: q.search.trim(), mode: "insensitive" as const } }
        : {}),
    };

    const rows = await prisma.financialRecord.groupBy({
      by: ["category", "type"],
      where: whereBase,
      _sum: { amount: true },
      orderBy: { category: "asc" },
    });

    return res.json({
      totals: rows.map((r) => ({
        category: r.category,
        type: r.type,
        total: r._sum.amount ?? new Prisma.Decimal(0),
      })),
    });
  } catch (err) {
    return next(err);
  }
});

const trendsSchema = rangeSchema.extend({
  months: z.coerce.number().int().min(1).max(36).default(6),
  days: z.coerce.number().int().min(1).max(365).default(30),
  granularity: z.enum(["month", "day"]).default("month"),
  search: z.string().optional(),
});

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

router.get("/trends", requireRole(UserRole.ANALYST, UserRole.ADMIN), async (req, res, next) => {
  try {
    const q = trendsSchema.parse(req.query);

    const to = q.to ?? new Date();
    let from: Date;
    if (q.from) {
      from = q.from;
    } else if (q.granularity === "day") {
      const endDay = startOfUtcDay(to);
      const start = new Date(endDay);
      start.setUTCDate(start.getUTCDate() - (q.days - 1));
      from = start;
    } else {
      from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - (q.months - 1), 1, 0, 0, 0));
    }

    const bucketExpr =
      q.granularity === "day"
        ? Prisma.sql`date_trunc('day', "occurredAt")`
        : Prisma.sql`date_trunc('month', "occurredAt")`;

    const searchClause = q.search?.trim()
      ? Prisma.sql`and "category" ilike ${`%${q.search.trim()}%`}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<Array<{ month: Date; type: RecordType; total: Prisma.Decimal }>>`
      select
        ${bucketExpr} as month,
        "type" as type,
        coalesce(sum("amount"), 0)::numeric as total
      from "FinancialRecord"
      where "deletedAt" is null
        and "occurredAt" >= ${from}
        and "occurredAt" <= ${to}
        ${searchClause}
      group by 1, 2
      order by 1 asc, 2 asc;
    `;

    return res.json({
      from,
      to,
      granularity: q.granularity,
      points: rows.map((r) => ({ month: r.month, type: r.type, total: r.total })),
    });
  } catch (err) {
    return next(err);
  }
});

export default router;

