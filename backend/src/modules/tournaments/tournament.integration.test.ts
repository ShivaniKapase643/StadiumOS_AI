import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../../app';
import { prisma } from '../../config/db';
import { createTestUserWithToken, deleteTestUser } from '../../test-helpers/testAuth';

const app = createApp();

describe('Tournaments API (integration)', () => {
  const createdUserIds: string[] = [];
  const createdTournamentIds: string[] = [];

  afterAll(async () => {
    await prisma.tournament.deleteMany({ where: { id: { in: createdTournamentIds } } });
    for (const id of createdUserIds) await deleteTestUser(id);
    await prisma.$disconnect();
  });

  it('rejects tournament creation without auth', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .send({ name: 'Unauthed Cup', sport: 'Football', startDate: '2026-01-01', endDate: '2026-01-31' });
    expect(res.status).toBe(401);
  });

  it('rejects tournament creation from a Fan (RBAC)', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ name: 'Fan-created Cup', sport: 'Football', startDate: '2026-01-01', endDate: '2026-01-31' });

    expect(res.status).toBe(403);
  });

  it('allows a Tournament Organizer to create a tournament', async () => {
    const organizer = await createTestUserWithToken(app, Role.TOURNAMENT_ORGANIZER);
    createdUserIds.push(organizer.user.id);

    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${organizer.accessToken}`)
      .send({ name: `Integration Cup ${Date.now()}`, sport: 'Football', startDate: '2026-01-01', endDate: '2026-01-31' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeTruthy();
    createdTournamentIds.push(res.body.data.id);
  });

  it('rejects a tournament with an end date before its start date', async () => {
    const organizer = await createTestUserWithToken(app, Role.TOURNAMENT_ORGANIZER);
    createdUserIds.push(organizer.user.id);

    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${organizer.accessToken}`)
      .send({ name: 'Backwards Cup', sport: 'Football', startDate: '2026-02-01', endDate: '2026-01-01' });

    expect(res.status).toBe(400);
  });

  it('lists tournaments with pagination metadata', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app).get('/api/tournaments').set('Authorization', `Bearer ${fan.accessToken}`).query({ page: 1, pageSize: 5 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 5 });
  });
});
