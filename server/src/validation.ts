import { RecordType, UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const passwordSchema = z.string().min(8).max(72);

export const idParamSchema = z.string().uuid();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const createUserSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
    status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
  })
  .strict();

export const patchUserSchema = z
  .object({
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  })
  .strict()
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: "At least one field is required.",
  });

export const patchPasswordSchema = z
  .object({
    password: passwordSchema,
  })
  .strict();

export const createRecordSchema = z
  .object({
    amount: z.coerce.number().finite().gt(0).lte(1_000_000_000),
    type: z.nativeEnum(RecordType),
    category: z.string().trim().min(1).max(60),
    occurredAt: z.coerce.date(),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
  })
  .strict();

export const patchRecordSchema = createRecordSchema.partial().strict();
