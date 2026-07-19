import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./fan-experience.service');
vi.mock('./concierge.service');

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as fanService from './fan-experience.service';
import { getConciergeInfo } from './concierge.service';

const app = createApp();
const FAN_TOKEN = tokenFor(Role.FAN);

describe('fan-experience.routes (Supertest, mocked service)', () => {
  it('rejects an unauthenticated request even for a read-only list', async () => {
    const res = await request(app).get('/api/fan-experience/lost-found');
    expect(res.status).toBe(401); // the whole router requires auth (router.use(requireAuth)) — no public routes here
  });

  it('lists lost & found items with pagination metadata', async () => {
    vi.mocked(fanService.listLostFoundItems).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 } as never);
    const res = await request(app).get('/api/fan-experience/lost-found').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 0, page: 1, pageSize: 20 });
  });

  it('rejects reporting a lost item with a too-short description (400)', async () => {
    const res = await request(app)
      .post('/api/fan-experience/lost-found')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ description: 'x', category: 'wallet' });
    expect(res.status).toBe(400);
  });

  it('requires auth to report a lost item', async () => {
    const res = await request(app).post('/api/fan-experience/lost-found').send({ description: 'Black wallet', category: 'wallet' });
    expect(res.status).toBe(401);
  });

  it('rejects a Fan updating a lost & found item status (RBAC — staff only)', async () => {
    const res = await request(app)
      .patch('/api/fan-experience/lost-found/item1/status')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ status: 'CLAIMED' });
    expect(res.status).toBe(403);
  });

  it('allows a Volunteer to update a lost & found item status', async () => {
    vi.mocked(fanService.updateLostFoundStatus).mockResolvedValue({ id: 'item1', status: 'CLAIMED' } as never);
    const res = await request(app)
      .patch('/api/fan-experience/lost-found/item1/status')
      .set('Authorization', `Bearer ${tokenFor(Role.VOLUNTEER)}`)
      .send({ status: 'CLAIMED' });
    expect(res.status).toBe(200);
  });

  it('rejects placing a food order with an empty items array (400)', async () => {
    const res = await request(app)
      .post('/api/fan-experience/food-orders')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ vendorId: '11111111-1111-1111-1111-111111111111', items: [] });
    expect(res.status).toBe(400);
  });

  it('places a valid food order (201)', async () => {
    vi.mocked(fanService.createFoodOrder).mockResolvedValue({ id: 'order1', totalAmount: 20 } as never);
    const res = await request(app)
      .post('/api/fan-experience/food-orders')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({
        vendorId: '11111111-1111-1111-1111-111111111111',
        items: [{ inventoryItemId: '22222222-2222-2222-2222-222222222222', name: 'Pizza', price: 10, quantity: 2 }],
      });
    expect(res.status).toBe(201);
  });

  it('searches seats by query params without requiring a specific role', async () => {
    vi.mocked(fanService.findSeats).mockResolvedValue([{ id: 's1' }] as never);
    const res = await request(app).get('/api/fan-experience/seat-finder?tier=VIP').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(fanService.findSeats).toHaveBeenCalledWith(expect.objectContaining({ tier: 'VIP' }));
  });

  it('requires auth for the VIP Concierge endpoint', async () => {
    const res = await request(app).get('/api/fan-experience/concierge');
    expect(res.status).toBe(401);
  });

  it('returns the personalized concierge summary for an authenticated fan', async () => {
    vi.mocked(getConciergeInfo).mockResolvedValue({ greetingName: 'Jai' } as never);
    const res = await request(app).get('/api/fan-experience/concierge').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.data.greetingName).toBe('Jai');
  });
});
