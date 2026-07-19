import { z } from 'zod';
import { Role } from '@prisma/client';

const PUBLIC_SIGNUP_ROLES = [Role.FAN, Role.VOLUNTEER, Role.VENDOR] as const;

// bcrypt silently truncates/ignores input past 72 bytes, so the upper bound
// isn't arbitrary — it keeps the whole password meaningful to the hash.
// Complexity (not just length) is required below since short, all-lowercase
// passwords remain the most common credential-stuffing target.
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain a symbol');

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: passwordSchema,
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
    newPassword: passwordSchema,
  }),
});
