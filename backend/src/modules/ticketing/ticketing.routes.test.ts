import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('./ticketing.service');

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import * as ticketingService from './ticketing.service';

const app = createApp();
const ADMIN_TOKEN = tokenFor(Role.STADIUM_ADMIN);
const FAN_TOKEN = tokenFor(Role.FAN);
const VOLUNTEER_TOKEN = tokenFor(Role.VOLUNTEER);

describe('ticketing.routes (Supertest, mocked service)', () => {
  it('rejects a Fan bulk-creating seats (RBAC — admin only)', async () => {
    const res = await request(app)
      .post('/api/ticketing/seats')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ stadiumId: '11111111-1111-1111-1111-111111111111', section: 'A', rows: 2, seatsPerRow: 10, tier: 'GENERAL' });
    expect(res.status).toBe(403);
  });

  it('bulk-creates seats for an admin', async () => {
    vi.mocked(ticketingService.bulkCreateSeats).mockResolvedValue([] as never);
    const res = await request(app)
      .post('/api/ticketing/seats')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ stadiumId: '11111111-1111-1111-1111-111111111111', section: 'A', rows: 2, seatsPerRow: 10, tier: 'GENERAL' });
    expect(res.status).toBe(201);
  });

  it('lists seat availability for a fixture (no role restriction)', async () => {
    vi.mocked(ticketingService.listAvailableSeats).mockResolvedValue({ seats: [], ticketTypes: [] } as never);
    const res = await request(app).get('/api/ticketing/fixtures/f1/seats').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('rejects a booking with more than 10 seat selections (400)', async () => {
    const seatSelections = Array.from({ length: 11 }, () => ({
      seatId: '11111111-1111-1111-1111-111111111111',
      ticketTypeId: '22222222-2222-2222-2222-222222222222',
    }));
    const res = await request(app)
      .post('/api/ticketing/bookings')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ fixtureId: '33333333-3333-3333-3333-333333333333', seatSelections, paymentMethod: 'CARD' });
    expect(res.status).toBe(400);
  });

  it('propagates a 409 when a selected seat is already booked', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(ticketingService.createBooking).mockRejectedValue(ApiError.conflict('One or more selected seats are already booked'));
    const res = await request(app)
      .post('/api/ticketing/bookings')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({
        fixtureId: '33333333-3333-3333-3333-333333333333',
        seatSelections: [{ seatId: '11111111-1111-1111-1111-111111111111', ticketTypeId: '22222222-2222-2222-2222-222222222222' }],
        paymentMethod: 'CARD',
      });
    expect(res.status).toBe(409);
  });

  it('books seats successfully (201)', async () => {
    vi.mocked(ticketingService.createBooking).mockResolvedValue({ booking: { id: 'b1' }, tickets: [] } as never);
    const res = await request(app)
      .post('/api/ticketing/bookings')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({
        fixtureId: '33333333-3333-3333-3333-333333333333',
        seatSelections: [{ seatId: '11111111-1111-1111-1111-111111111111', ticketTypeId: '22222222-2222-2222-2222-222222222222' }],
        paymentMethod: 'CARD',
      });
    expect(res.status).toBe(201);
  });

  it("requires auth to view the caller's tickets", async () => {
    const res = await request(app).get('/api/ticketing/my-tickets');
    expect(res.status).toBe(401);
  });

  it('returns the caller\'s tickets with QR codes', async () => {
    vi.mocked(ticketingService.getMyTickets).mockResolvedValue([] as never);
    const res = await request(app).get('/api/ticketing/my-tickets').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
  });

  it('requests a refund', async () => {
    vi.mocked(ticketingService.requestRefund).mockResolvedValue({ id: 'ref1', status: 'PROCESSED' } as never);
    const res = await request(app)
      .post('/api/ticketing/refunds')
      .set('Authorization', `Bearer ${FAN_TOKEN}`)
      .send({ ticketId: '11111111-1111-1111-1111-111111111111' });
    expect(res.status).toBe(200);
  });

  it('rejects a Fan scanning a ticket (RBAC — scanner roles only)', async () => {
    const res = await request(app).post('/api/ticketing/scan').set('Authorization', `Bearer ${FAN_TOKEN}`).send({ code: 'a-valid-looking-code' });
    expect(res.status).toBe(403);
  });

  it('rejects a scan with a too-short code (400)', async () => {
    const res = await request(app).post('/api/ticketing/scan').set('Authorization', `Bearer ${VOLUNTEER_TOKEN}`).send({ code: 'x' });
    expect(res.status).toBe(400);
  });

  it('scans a valid ticket for a Volunteer', async () => {
    vi.mocked(ticketingService.verifyAndScanTicket).mockResolvedValue({ ticket: { id: 't1', status: 'USED' }, seat: {} } as never);
    const res = await request(app).post('/api/ticketing/scan').set('Authorization', `Bearer ${VOLUNTEER_TOKEN}`).send({ code: 'a-valid-looking-code' });
    expect(res.status).toBe(200);
  });

  it('propagates a 409 re-scanning an already-used ticket', async () => {
    const { ApiError } = await import('../../utils/apiResponse');
    vi.mocked(ticketingService.verifyAndScanTicket).mockRejectedValue(ApiError.conflict('Ticket already checked in'));
    const res = await request(app).post('/api/ticketing/scan').set('Authorization', `Bearer ${VOLUNTEER_TOKEN}`).send({ code: 'a-valid-looking-code' });
    expect(res.status).toBe(409);
  });
});
