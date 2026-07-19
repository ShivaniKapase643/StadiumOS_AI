import bcrypt from 'bcryptjs';
import request from 'supertest';
import { Application } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/db';

/**
 * Public /auth/register only allows FAN/VOLUNTEER/VENDOR (see
 * auth.validation.ts), so integration tests covering privileged-role
 * endpoints (organizer/admin/security/medical) create the user directly via
 * Prisma and log in through the real API to get a genuine access token.
 */
export async function createTestUserWithToken(app: Application, role: Role) {
  const email = `itest-${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'IntegrationTest123!';
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name: `Integration Test ${role}`, email, passwordHash, role },
  });

  const login = await request(app).post('/api/auth/login').send({ email, password });
  if (login.status !== 200) {
    throw new Error(`Test user login failed: ${JSON.stringify(login.body)}`);
  }

  return { user, accessToken: login.body.data.accessToken as string };
}

export async function deleteTestUser(userId: string) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}
