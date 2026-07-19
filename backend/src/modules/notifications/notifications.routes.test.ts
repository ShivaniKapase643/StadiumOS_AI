import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./notifications.service');
vi.mock('../users/audit.service', () => ({ logAudit: vi.fn() }));

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as notificationsService from './notifications.service';

const app = createApp();
const FAN_TOKEN = tokenFor(Role.FAN);
const ADMIN_TOKEN = tokenFor(Role.SUPER_ADMIN);

describe('notifications.routes (Supertest, mocked service)', () => {
  it('requires auth to view your own notifications', async () => {
    const res = await request(app).get('/api/notifications/mine');
    expect(res.status).toBe(401);
  });

  it("returns the caller's own notifications", async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue([] as never);
    const res = await request(app).get('/api/notifications/mine').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('marks a notification as read', async () => {
    vi.mocked(notificationsService.markNotificationRead).mockResolvedValue({ id: 'n1', read: true } as never);
    const res = await request(app).patch('/api/notifications/n1/read').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('marks all notifications as read', async () => {
    vi.mocked(notificationsService.markAllRead).mockResolvedValue(undefined);
    const res = await request(app).post('/api/notifications/read-all').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('rejects a Fan broadcasting a notification (RBAC)', async () => {
    const res = await request(app)
      .post('/api/notifications/broadcast')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ title: 'Test', body: 'Test body' });
    expect(res.status).toBe(403);
  });

  it('broadcasts a notification for an admin and writes an audit log entry', async () => {
    vi.mocked(notificationsService.broadcastNotification).mockResolvedValue({ recipientCount: 42 } as never);
    const res = await request(app)
      .post('/api/notifications/broadcast')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ title: 'Gate change', body: 'Gate C is now open' });
    expect(res.status).toBe(201);
    expect(res.body.data.recipientCount).toBe(42);
  });

  it('rejects a broadcast missing a required field (400)', async () => {
    const res = await request(app).post('/api/notifications/broadcast').set('Authorization', `Bearer ${ADMIN_TOKEN}`).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  it('rejects a Fan viewing notification logs (RBAC — admin only)', async () => {
    const res = await request(app).get('/api/notifications/logs').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('returns notification logs for an admin', async () => {
    vi.mocked(notificationsService.getNotificationLogs).mockResolvedValue([] as never);
    const res = await request(app).get('/api/notifications/logs').set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
  });
});
