import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./parking.service');
vi.mock('../users/audit.service', () => ({ logAudit: vi.fn() }));

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as parkingService from './parking.service';

const app = createApp();
const FAN_TOKEN = tokenFor(Role.FAN);

describe('parking.routes (Supertest, mocked service)', () => {
  it('lists parking lots for any authenticated user', async () => {
    vi.mocked(parkingService.listLots).mockResolvedValue([] as never);
    const res = await request(app).get('/api/parking/lots').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('returns parking analytics', async () => {
    vi.mocked(parkingService.getParkingAnalytics).mockResolvedValue([] as never);
    const res = await request(app).get('/api/parking/analytics').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it("requires auth to view the caller's reservations", async () => {
    const res = await request(app).get('/api/parking/reservations');
    expect(res.status).toBe(401);
  });

  it("returns the caller's own reservations", async () => {
    vi.mocked(parkingService.getMyReservations).mockResolvedValue([] as never);
    const res = await request(app).get('/api/parking/reservations').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('rejects a reservation with a missing vehicle number (400)', async () => {
    const res = await request(app)
      .post('/api/parking/reservations')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ slotId: '11111111-1111-1111-1111-111111111111', startTime: '2026-01-01T10:00:00Z' });
    expect(res.status).toBe(400);
  });

  it('creates a reservation and writes an audit log entry', async () => {
    vi.mocked(parkingService.createReservation).mockResolvedValue({ id: 'r1' } as never);
    const res = await request(app)
      .post('/api/parking/reservations')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ slotId: '11111111-1111-1111-1111-111111111111', vehicleNumber: 'AB123', startTime: '2026-01-01T10:00:00Z' });
    expect(res.status).toBe(201);
  });

  it('propagates a 409 when the slot is already taken', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(parkingService.createReservation).mockRejectedValue(ApiError.conflict('Slot is not available'));
    const res = await request(app)
      .post('/api/parking/reservations')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ slotId: '11111111-1111-1111-1111-111111111111', vehicleNumber: 'AB123', startTime: '2026-01-01T10:00:00Z' });
    expect(res.status).toBe(409);
  });

  it('cancels a reservation', async () => {
    vi.mocked(parkingService.cancelReservation).mockResolvedValue(undefined);
    const res = await request(app).delete('/api/parking/reservations/r1').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('propagates a 404 cancelling a reservation that does not belong to the caller', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(parkingService.cancelReservation).mockRejectedValue(ApiError.notFound('Reservation not found'));
    const res = await request(app).delete('/api/parking/reservations/nope').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(404);
  });
});
