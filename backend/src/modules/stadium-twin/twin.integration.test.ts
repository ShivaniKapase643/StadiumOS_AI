import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../../app';
import { prisma } from '../../config/db';
import { createTestUserWithToken, deleteTestUser } from '../../test-helpers/testAuth';

const app = createApp();

describe('Digital Twin API (integration)', () => {
  const createdUserIds: string[] = [];
  let stadiumId: string;
  let gateZoneId: string;

  beforeAll(async () => {
    const stadium = await prisma.stadium.create({ data: { name: `Twin Test Stadium ${Date.now()}`, capacity: 2000 } });
    stadiumId = stadium.id;

    const gate = await prisma.stadiumZone.create({
      data: { stadiumId, name: 'Gate 1', type: 'GATE', x: 10, y: 10, capacity: 500 },
    });
    gateZoneId = gate.id;

    await prisma.crowdDensityReading.create({
      data: { zoneId: gateZoneId, count: 120, capacityPct: 24, densityLevel: 'LOW' },
    });
  });

  afterAll(async () => {
    await prisma.stadium.delete({ where: { id: stadiumId } }); // cascades zones, crowd readings, equipment
    for (const id of createdUserIds) await deleteTestUser(id);
    await prisma.$disconnect();
  });

  it('returns the stadium overview by id', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app).get('/api/twin/overview').set('Authorization', `Bearer ${fan.accessToken}`).query({ stadiumId });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(stadiumId);
  });

  it('returns 404 for an overview request when no stadium exists for a bogus id', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app)
      .get('/api/twin/overview')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .query({ stadiumId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
  });

  it('lists zones for a stadium with their latest crowd reading attached', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app).get(`/api/twin/stadiums/${stadiumId}/zones`).set('Authorization', `Bearer ${fan.accessToken}`);

    expect(res.status).toBe(200);
    const gate = res.body.data.find((z: { id: string }) => z.id === gateZoneId);
    expect(gate).toBeTruthy();
    // Asserting the exact seeded value ('LOW') here would be racy: GATE
    // zones are exactly what the live production data simulator randomly
    // walks every 20s against this same shared dev database (see
    // liveDataSimulator.ts's tickCrowdDensity, which queries GATE zones
    // globally, no stadium scoping) — it can overwrite this zone's latest
    // reading before this assertion runs. What actually matters here is
    // that the endpoint attaches *a* well-shaped latest reading at all.
    expect(gate.crowdReadings).toHaveLength(1);
    expect(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(gate.crowdReadings[0].densityLevel);
    expect(typeof gate.crowdReadings[0].capacityPct).toBe('number');
  });

  it('returns an empty zone list for a stadium with no zones (empty state)', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);
    const emptyStadium = await prisma.stadium.create({ data: { name: `Empty Stadium ${Date.now()}`, capacity: 100 } });

    const res = await request(app).get(`/api/twin/stadiums/${emptyStadium.id}/zones`).set('Authorization', `Bearer ${fan.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);

    await prisma.stadium.delete({ where: { id: emptyStadium.id } });
  });

  it('returns a live snapshot with zones, parking, equipment, and active alerts', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app).get(`/api/twin/stadiums/${stadiumId}/live`).set('Authorization', `Bearer ${fan.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.zones.length).toBeGreaterThan(0);
    expect(res.body.data).toHaveProperty('parkingLots');
    expect(res.body.data).toHaveProperty('equipment');
    expect(res.body.data).toHaveProperty('activeAlerts');
  });

  it('rejects a Fan creating a zone (RBAC — admin only)', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app)
      .post('/api/twin/zones')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ stadiumId, name: 'Unauthorized Zone', type: 'GATE', x: 5, y: 5 });

    expect(res.status).toBe(403);
  });

  it('allows a Stadium Admin to create, update, and delete a zone', async () => {
    const admin = await createTestUserWithToken(app, Role.STADIUM_ADMIN);
    createdUserIds.push(admin.user.id);

    const createRes = await request(app)
      .post('/api/twin/zones')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ stadiumId, name: 'Medical Room B', type: 'MEDICAL', x: 20, y: 30, capacity: 10 });
    expect(createRes.status).toBe(201);
    const zoneId = createRes.body.data.id;

    const updateRes = await request(app)
      .patch(`/api/twin/zones/${zoneId}/status`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'DEGRADED' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('DEGRADED');

    const deleteRes = await request(app).delete(`/api/twin/zones/${zoneId}`).set('Authorization', `Bearer ${admin.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const zoneAfter = await prisma.stadiumZone.findUnique({ where: { id: zoneId } });
    expect(zoneAfter).toBeNull();
  });

  it('returns 404 when updating the status of a non-existent zone', async () => {
    const admin = await createTestUserWithToken(app, Role.STADIUM_ADMIN);
    createdUserIds.push(admin.user.id);

    const res = await request(app)
      .patch('/api/twin/zones/00000000-0000-0000-0000-000000000000/status')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'OPERATIONAL' });

    expect(res.status).toBe(404);
  });
});
