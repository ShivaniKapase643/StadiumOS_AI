import { z } from 'zod';
import { Role } from '@prisma/client';

const PUBLIC_SIGNUP_ROLES = [Role.FAN, Role.VOLUNTEER, Role.VENDOR] as const;

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(72),
    phone: z.string().min(7).max(20).optional(),
    role: z.enum(PUBLIC_SIGNUP_ROLES).default(Role.FAN),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    newPassword: z.string().min(8).max(72),
  }),
});
