import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./vendor.service');

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as vendorService from './vendor.service';

const app = createApp();
const VENDOR_TOKEN = tokenFor(Role.VENDOR);
const FAN_TOKEN = tokenFor(Role.FAN);

describe('vendor.routes (Supertest, mocked service)', () => {
  it('rejects a Fan viewing vendor-only summary data (RBAC)', async () => {
    const res = await request(app).get('/api/vendor/all').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('allows a Super Admin to view the all-vendors summary', async () => {
    vi.mocked(vendorService.listAllVendorsSummary).mockResolvedValue([] as never);
    const res = await request(app).get('/api/vendor/all').set('Authorization', `Bearer ${tokenFor(Role.SUPER_ADMIN)}`);
    expect(res.status).toBe(200);
  });

  it('rejects a Fan accessing the vendor-only "my profile" route', async () => {
    const res = await request(app).get('/api/vendor/me').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('returns the vendor profile for a Vendor-role caller', async () => {
    vi.mocked(vendorService.getMyVendor).mockResolvedValue({ id: 'v1', name: "Grace's Grill" } as never);
    const res = await request(app).get('/api/vendor/me').set('Authorization', `Bearer ${VENDOR_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('propagates a 404 when the vendor has no profile yet', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(vendorService.getMyVendor).mockRejectedValue(ApiError.notFound('No vendor profile found for this user'));
    const res = await request(app).get('/api/vendor/me').set('Authorization', `Bearer ${VENDOR_TOKEN}`);
    expect(res.status).toBe(404);
  });

  it('adds an inventory item (201)', async () => {
    vi.mocked(vendorService.addInventoryItem).mockResolvedValue({ id: 'item1' } as never);
    const res = await request(app)
      .post('/api/vendor/inventory')
      .set('Authorization', `Bearer ${VENDOR_TOKEN}`)
      .send({ name: 'Pizza', sku: 'FB-011', stock: 50, price: 12 });
    expect(res.status).toBe(201);
  });

  it('rejects an inventory item with a negative price (400)', async () => {
    const res = await request(app)
      .post('/api/vendor/inventory')
      .set('Authorization', `Bearer ${VENDOR_TOKEN}`)
      .send({ name: 'Pizza', sku: 'FB-011', stock: 50, price: -5 });
    expect(res.status).toBe(400);
  });

  it("propagates a 404 when updating another vendor's inventory item", async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(vendorService.updateInventoryItem).mockRejectedValue(ApiError.notFound('Inventory item not found'));
    const res = await request(app).patch('/api/vendor/inventory/item1').set('Authorization', `Bearer ${VENDOR_TOKEN}`).send({ stock: 5 });
    expect(res.status).toBe(404);
  });

  it("lists the vendor's incoming orders", async () => {
    vi.mocked(vendorService.getMyOrders).mockResolvedValue([] as never);
    const res = await request(app).get('/api/vendor/orders').set('Authorization', `Bearer ${VENDOR_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('rejects an order status update with an invalid enum value (400)', async () => {
    const res = await request(app)
      .patch('/api/vendor/orders/order1/status')
      .set('Authorization', `Bearer ${VENDOR_TOKEN}`)
      .send({ status: 'NOT_A_STATUS' });
    expect(res.status).toBe(400);
  });

  it('updates order status', async () => {
    vi.mocked(vendorService.updateOrderStatus).mockResolvedValue({ id: 'order1', status: 'READY' } as never);
    const res = await request(app)
      .patch('/api/vendor/orders/order1/status')
      .set('Authorization', `Bearer ${VENDOR_TOKEN}`)
      .send({ status: 'READY' });
    expect(res.status).toBe(200);
  });

  it('returns revenue analytics for the vendor', async () => {
    vi.mocked(vendorService.getMyAnalytics).mockResolvedValue({ totalRevenue: 500, totalOrders: 20, revenueByDay: [] } as never);
    const res = await request(app).get('/api/vendor/analytics').set('Authorization', `Bearer ${VENDOR_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalRevenue).toBe(500);
  });
});
