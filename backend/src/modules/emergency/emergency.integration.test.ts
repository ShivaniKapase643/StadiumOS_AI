import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../../app';
import { prisma } from '../../config/db';
import { createTestUserWithToken, deleteTestUser } from '../../test-helpers/testAuth';

const app = createApp();

describe('Emergency API (integration)', () => {
  const createdUserIds: string[] = [];
  const createdAlertIds: string[] = [];

  afterAll(async () => {
    await prisma.ambulanceDispatch.deleteMany({ where: { sosAlertId: { in: createdAlertIds } } });
    await prisma.sOSAlert.deleteMany({ where: { id: { in: createdAlertIds } } });
    for (const id of createdUserIds) await deleteTestUser(id);
    await prisma.$disconnect();
  });

  it('lets any authenticated Fan raise an SOS alert', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app).post('/api/emergency/sos').set('Authorization', `Bearer ${fan.accessToken}`).send({ type: 'MEDICAL' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('OPEN');
    createdAlertIds.push(res.body.data.id);
  });

  it('rejects an SOS alert with an invalid type', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app)
      .post('/api/emergency/sos')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ type: 'ZOMBIE_OUTBREAK' });

    expect(res.status).toBe(400);
  });

  it('rejects a Fan dispatching an ambulance (RBAC — responders only)', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const alertRes = await request(app).post('/api/emergency/sos').set('Authorization', `Bearer ${fan.accessToken}`).send({ type: 'MEDICAL' });
    createdAlertIds.push(alertRes.body.data.id);

    const dispatchRes = await request(app)
      .post(`/api/emergency/sos/${alertRes.body.data.id}/dispatch`)
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({});

    expect(dispatchRes.status).toBe(403);
  });

  it('lets a Medical Team member dispatch and then resolve an SOS alert', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    const medic = await createTestUserWithToken(app, Role.MEDICAL_TEAM);
    createdUserIds.push(fan.user.id, medic.user.id);

    const alertRes = await request(app).post('/api/emergency/sos').set('Authorization', `Bearer ${fan.accessToken}`).send({ type: 'MEDICAL' });
    const alertId = alertRes.body.data.id;
    createdAlertIds.push(alertId);

    const dispatchRes = await request(app)
      .post(`/api/emergency/sos/${alertId}/dispatch`)
      .set('Authorization', `Bearer ${medic.accessToken}`)
      .send({ driverName: 'Test Driver' });
    expect(dispatchRes.status).toBe(201);

    const resolveRes = await request(app)
      .post(`/api/emergency/sos/${alertId}/resolve`)
      .set('Authorization', `Bearer ${medic.accessToken}`)
      .send();
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('RESOLVED');
  });
});
