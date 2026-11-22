import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export const passwordChangeSchema = z.object({
  password: z.string().min(12).max(128),
});

export const memberCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  memberNumber: z.string().trim().max(50).optional(),
  reason: z.string().trim().min(10).max(500),
});

export const reopenSchema = z.object({
  reportId: z.string().uuid(),
  reason: z.string().trim().min(10).max(500),
});
