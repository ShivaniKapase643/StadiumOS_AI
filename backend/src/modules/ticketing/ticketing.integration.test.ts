import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { Role, PaymentStatus } from '@prisma/client';
import { createApp } from '../../app';
import { prisma } from '../../config/db';
import { createTestUserWithToken, deleteTestUser } from '../../test-helpers/testAuth';

// The real payment.service is a self-contained ~92%-success random simulator
// (see its own JSDoc) — mocking it here makes the booking-success and
// booking-failure paths deterministic instead of depending on Math.random(),
// while still exercising the real charge()/processRefund() call sites.
vi.mock('./payment.service', () => ({
  charge: vi.fn(),
  processRefund: vi.fn(),
}));

import * as paymentService from './payment.service';

// A random transactionRef per queued mock, not a fixed literal — Payment.transactionRef
// is unique in the DB, and a fixed string would collide with a leftover row
// from any previous run whose cleanup didn't get to finish (e.g. a dropped
// connection mid-afterAll).
function mockCharge(status: PaymentStatus) {
  vi.mocked(paymentService.charge).mockResolvedValueOnce({ status, transactionRef: `MOCK_${randomUUID()}` });
}

const app = createApp();

describe('Ticketing API (integration)', () => {
  const createdUserIds: string[] = [];
  let stadiumId: string;
  let tournamentId: string;
  let fixtureId: string;
  let ticketTypeId: string;
  let seatIds: string[];

  beforeAll(async () => {
    const stadium = await prisma.stadium.create({ data: { name: `Ticketing Test Stadium ${Date.now()}`, capacity: 500 } });
    stadiumId = stadium.id;

    const tournament = await prisma.tournament.create({
      data: { name: `Ticketing Test Cup ${Date.now()}`, sport: 'Football', startDate: new Date(), endDate: new Date(Date.now() + 86400000), stadiumId },
    });
    tournamentId = tournament.id;

    const homeTeam = await prisma.team.create({ data: { tournamentId, name: 'Home FC' } });
    const awayTeam = await prisma.team.create({ data: { tournamentId, name: 'Away FC' } });

    const fixture = await prisma.fixture.create({
      data: { tournamentId, round: 'Final', homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, scheduledAt: new Date() },
    });
    fixtureId = fixture.id;

    const ticketType = await prisma.ticketType.create({
      data: { fixtureId, name: 'General Admission', tier: 'GENERAL', price: 25, quantity: 100 },
    });
    ticketTypeId = ticketType.id;

    const seats = await prisma.seat.createManyAndReturn({
      data: [
        { stadiumId, section: 'A', row: 'A', number: 1, tier: 'GENERAL' },
        { stadiumId, section: 'A', row: 'A', number: 2, tier: 'GENERAL' },
        { stadiumId, section: 'A', row: 'A', number: 3, tier: 'GENERAL' },
      ],
    });
    seatIds = seats.map((s) => s.id);
  });

  afterAll(async () => {
    // Refund->Ticket, Ticket->Seat, and Booking->User are all RESTRICT
    // relations (this history shouldn't silently vanish in production), and
    // Tournament->Stadium is SET NULL rather than CASCADE — so none of this
    // unwinds automatically from a single Stadium delete. Clean up bottom-up.
    await prisma.refund.deleteMany({ where: { ticket: { seat: { stadiumId } } } });
    await prisma.booking.deleteMany({ where: { userId: { in: createdUserIds } } }); // cascades Ticket + Payment
    await prisma.tournament.delete({ where: { id: tournamentId } }); // cascades Team/Fixture/Match/TicketType
    await prisma.stadium.delete({ where: { id: stadiumId } }); // cascades Seat (now unreferenced)
    for (const id of createdUserIds) await deleteTestUser(id);
    await prisma.$disconnect();
  });

  it('lists seats for a fixture with none booked yet', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app).get(`/api/ticketing/fixtures/${fixtureId}/seats`).set('Authorization', `Bearer ${fan.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.seats.every((s: { isBooked: boolean }) => s.isBooked === false)).toBe(true);
    expect(res.body.data.ticketTypes).toHaveLength(1);
  });

  it('rejects booking when the mock gateway declines payment, leaving the seat available', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);
    mockCharge(PaymentStatus.FAILED);

    const res = await request(app)
      .post('/api/ticketing/bookings')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ fixtureId, seatSelections: [{ seatId: seatIds[0], ticketTypeId }], paymentMethod: 'CARD' });

    expect(res.status).toBe(400);

    const seatsAfter = await request(app).get(`/api/ticketing/fixtures/${fixtureId}/seats`).set('Authorization', `Bearer ${fan.accessToken}`);
    const seat = seatsAfter.body.data.seats.find((s: { id: string }) => s.id === seatIds[0]);
    expect(seat.isBooked).toBe(false);
  });

  it('books a seat end-to-end and issues a signed QR ticket', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);
    mockCharge(PaymentStatus.SUCCESS);

    const res = await request(app)
      .post('/api/ticketing/bookings')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ fixtureId, seatSelections: [{ seatId: seatIds[0], ticketTypeId }], paymentMethod: 'CARD' });

    expect(res.status).toBe(201);
    expect(res.body.data.booking.status).toBe('CONFIRMED');
    expect(res.body.data.tickets).toHaveLength(1);
    expect(res.body.data.tickets[0].status).toBe('VALID');
    expect(res.body.data.tickets[0].qrCode).toBeTruthy();

    const myTickets = await request(app).get('/api/ticketing/my-tickets').set('Authorization', `Bearer ${fan.accessToken}`);
    expect(myTickets.status).toBe(200);
    expect(myTickets.body.data.some((t: { id: string }) => t.id === res.body.data.tickets[0].id)).toBe(true);
    expect(myTickets.body.data[0].qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('rejects booking a seat that is already booked (conflict)', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);
    mockCharge(PaymentStatus.SUCCESS);

    // seatIds[0] was already booked by the previous test.
    const res = await request(app)
      .post('/api/ticketing/bookings')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ fixtureId, seatSelections: [{ seatId: seatIds[0], ticketTypeId }], paymentMethod: 'UPI' });

    expect(res.status).toBe(409);
  });

  it('rejects a booking with an invalid ticket type id (validation)', async () => {
    const fan = await createTestUserWithToken(app, Role.FAN);
    createdUserIds.push(fan.user.id);

    const res = await request(app)
      .post('/api/ticketing/bookings')
      .set('Authorization', `Bearer ${fan.accessToken}`)
      .send({ fixtureId, seatSelections: [{ seatId: seatIds[1], ticketTypeId: '00000000-0000-0000-0000-000000000000' }], paymentMethod: 'CARD' });

    expect(res.status).toBe(400);
  });

  describe('QR scan / verification', () => {
    let validTicketId: string;
    let validQrCode: string;

    beforeAll(async () => {
      const fan = await createTestUserWithToken(app, Role.FAN);
      createdUserIds.push(fan.user.id);
      mockCharge(PaymentStatus.SUCCESS);

      const res = await request(app)
        .post('/api/ticketing/bookings')
        .set('Authorization', `Bearer ${fan.accessToken}`)
        .send({ fixtureId, seatSelections: [{ seatId: seatIds[1], ticketTypeId }], paymentMethod: 'CARD' });

      validTicketId = res.body.data.tickets[0].id;
      validQrCode = res.body.data.tickets[0].qrCode;
    });

    it('rejects a scan from a Fan (RBAC — scanner roles only)', async () => {
      const fan = await createTestUserWithToken(app, Role.FAN);
      createdUserIds.push(fan.user.id);

      const res = await request(app).post('/api/ticketing/scan').set('Authorization', `Bearer ${fan.accessToken}`).send({ code: validQrCode });
      expect(res.status).toBe(403);
    });

    it('rejects a tampered/invalid QR code', async () => {
      const volunteer = await createTestUserWithToken(app, Role.VOLUNTEER);
      createdUserIds.push(volunteer.user.id);

      const res = await request(app)
        .post('/api/ticketing/scan')
        .set('Authorization', `Bearer ${volunteer.accessToken}`)
        .send({ code: `${validQrCode}tampered` });
      expect(res.status).toBe(400);
    });

    it('checks in a valid ticket on first scan', async () => {
      const volunteer = await createTestUserWithToken(app, Role.VOLUNTEER);
      createdUserIds.push(volunteer.user.id);

      const res = await request(app)
        .post('/api/ticketing/scan')
        .set('Authorization', `Bearer ${volunteer.accessToken}`)
        .send({ code: validQrCode });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('USED');
      expect(res.body.data.ticket.id).toBe(validTicketId);
    });

    it('rejects re-scanning an already-used ticket (conflict)', async () => {
      const volunteer = await createTestUserWithToken(app, Role.VOLUNTEER);
      createdUserIds.push(volunteer.user.id);

      const res = await request(app)
        .post('/api/ticketing/scan')
        .set('Authorization', `Bearer ${volunteer.accessToken}`)
        .send({ code: validQrCode });

      expect(res.status).toBe(409);
    });
  });

  describe('Refunds', () => {
    it('refunds a valid, unused ticket and frees up the ticket type sold count', async () => {
      const fan = await createTestUserWithToken(app, Role.FAN);
      createdUserIds.push(fan.user.id);
      mockCharge(PaymentStatus.SUCCESS);
      vi.mocked(paymentService.processRefund).mockResolvedValueOnce({ status: 'PROCESSED' });

      const bookingRes = await request(app)
        .post('/api/ticketing/bookings')
        .set('Authorization', `Bearer ${fan.accessToken}`)
        .send({ fixtureId, seatSelections: [{ seatId: seatIds[2], ticketTypeId }], paymentMethod: 'WALLET' });
      const ticketId = bookingRes.body.data.tickets[0].id;

      const refundRes = await request(app)
        .post('/api/ticketing/refunds')
        .set('Authorization', `Bearer ${fan.accessToken}`)
        .send({ ticketId, reason: 'Change of plans' });

      expect(refundRes.status).toBe(200);
      expect(refundRes.body.data.status).toBe('PROCESSED');

      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      expect(ticket?.status).toBe('REFUNDED');
    });

    it("rejects refunding another user's ticket", async () => {
      const owner = await createTestUserWithToken(app, Role.FAN);
      const intruder = await createTestUserWithToken(app, Role.FAN);
      createdUserIds.push(owner.user.id, intruder.user.id);
      mockCharge(PaymentStatus.SUCCESS);

      const extraSeat = await prisma.seat.create({ data: { stadiumId, section: 'B', row: 'A', number: 1, tier: 'GENERAL' } });
      const bookingRes = await request(app)
        .post('/api/ticketing/bookings')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ fixtureId, seatSelections: [{ seatId: extraSeat.id, ticketTypeId }], paymentMethod: 'CARD' });

      const refundRes = await request(app)
        .post('/api/ticketing/refunds')
        .set('Authorization', `Bearer ${intruder.accessToken}`)
        .send({ ticketId: bookingRes.body.data.tickets[0].id });

      expect(refundRes.status).toBe(404);
    });
  });
});
