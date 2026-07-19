import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../../app';
import { prisma } from '../../config/db';
import { createTestUserWithToken, deleteTestUser } from '../../test-helpers/testAuth';

const app = createApp();

describe('Security API (integration)', () => {
  const createdUserIds: string[] = [];
  const createdIncidentIds: string[] = [];

  afterAll(async () => {
    await prisma.incident.deleteMany({ where: { id: { in: createdIncidentIds } } });
    for (const id of createdUserIds) await deleteTestUser(id);
    await prisma.$disconnect();
  });

  it('rejects a Fan reporting an incident (RBAC — Fans are not on-site staff)', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app)
      .post('/api/security/incidents')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ type: 'Trespassing', severity: 'MEDIUM', description: 'Someone climbed a fence near gate 3' });

    expect(res.status).toBe(403);
  });

  it('allows a Security Officer to report and then update an incident', async () => {
    const officer = await createTestUserWithToken(app, Role.SECURITY_OFFICER);
    createdUserIds.push(officer.user.id);

    const createRes = await request(app)
      .post('/api/security/incidents')
      .set('Authorization', `Bearer ${officer.accessToken}`)
      .send({ type: 'Suspicious package', severity: 'HIGH', description: 'Unattended bag reported near Gate 2' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('OPEN');
    const incidentId = createRes.body.data.id;
    createdIncidentIds.push(incidentId);

    const updateRes = await request(app)
      .patch(`/api/security/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${officer.accessToken}`)
      .send({ status: 'RESOLVED' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('RESOLVED');
  });

  it('rejects an incident report with an invalid severity value', async () => {
    const officer = await createTestUserWithToken(app, Role.SECURITY_OFFICER);
    createdUserIds.push(officer.user.id);

    const res = await request(app)
      .post('/api/security/incidents')
      .set('Authorization', `Bearer ${officer.accessToken}`)
      .send({ type: 'Fire', severity: 'APOCALYPTIC', description: 'Not a real severity level' });

    expect(res.status).toBe(400);
  });

  it('paginates the incidents list and bounds pageSize to the server max', async () => {
    const officer = await createTestUserWithToken(app, Role.SECURITY_OFFICER);
    createdUserIds.push(officer.user.id);

    const res = await request(app)
      .get('/api/security/incidents')
      .set('Authorization', `Bearer ${officer.accessToken}`)
      .query({ page: 1, pageSize: 99999 });

    expect(res.status).toBe(200);
    expect(res.body.meta.pageSize).toBeLessThanOrEqual(100);
  });
});
