import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { sendEmail } from '../../utils/email';
import { env } from '../../config/env';

const SALT_ROUNDS = 12;

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
}

async function issueTokenPair(userId: string, role: Role, email: string) {
  const accessToken = signAccessToken({ sub: userId, role, email });
  const refreshToken = signRefreshToken(userId);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}

function sanitizeUser(user: { id: string; name: string; email: string; role: Role; avatarUrl: string | null }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone,
      role: input.role,
    },
  });

  const tokens = await issueTokenPair(user.id, user.role, user.email);
  return { user: sanitizeUser(user), ...tokens };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const tokens = await issueTokenPair(user.id, user.role, user.email);
  return { user: sanitizeUser(user), ...tokens };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token has been revoked or expired');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw ApiError.unauthorized();

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
  const tokens = await issueTokenPair(user.id, user.role, user.email);
  return { user: sanitizeUser(user), ...tokens };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revoked: true },
  });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always resolve without leaking whether the account exists.
  if (!user) return;

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + env.passwordResetExpiresMin * 60 * 1000),
    },
  });

  const resetLink = `${env.clientUrl}/reset-password?token=${token}`;
  await sendEmail(
    user.email,
    'Reset your Smart Stadium OS password',
    `<p>Hi ${user.name},</p><p>Click the link below to reset your password. This link expires in ${env.passwordResetExpiresMin} minutes.</p><p><a href="${resetLink}">${resetLink}</a></p>`
  );
}

export async function resetPassword(token: string, newPassword: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
    prisma.refreshToken.updateMany({ where: { userId: resetToken.userId }, data: { revoked: true } }),
  ]);
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  return sanitizeUser(user);
}
