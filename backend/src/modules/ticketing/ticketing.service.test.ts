import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentStatus, TicketStatus } from '@prisma/client';

// Pure unit tests for createBooking's validation/conflict branches, mocking
// Prisma entirely — these run in milliseconds and pin down exact error
// codes without needing a real Postgres, complementing the slower
// ticketing.integration.test.ts (which exercises the full HTTP+DB stack).
vi.mock('../../config/db', () => ({
  prisma: {
    fixture: { findUnique: vi.fn() },
    match: { upsert: vi.fn() },
    ticketType: { findMany: vi.fn(), update: vi.fn() },
    ticket: { findMany: vi.fn(), createMany: vi.fn() },
    booking: { create: vi.fn(), update: vi.fn() },
    payment: { create: vi.fn() },
    user: { findUnique: vi.fn() },
    notification: { create: vi.fn() },
  },
}));
vi.mock('../../utils/email', () => ({ sendEmail: vi.fn() }));
vi.mock('../../sockets', () => ({ emitToAll: vi.fn() }));
vi.mock('./payment.service', () => ({ charge: vi.fn(), processRefund: vi.fn() }));

import { prisma } from '../../config/db';
import { createBooking } from './ticketing.service';
import { charge } from './payment.service';

const FIXTURE_ID = 'fixture-1';
const SEAT_ID = 'seat-1';
const TICKET_TYPE_ID = 'ticket-type-1';
const USER_ID = 'user-1';

describe('createBooking (unit, mocked Prisma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a booking for a fixture that does not exist', async () => {
    vi.mocked(prisma.fixture.findUnique).mockResolvedValue(null);

    await expect(
      createBooking(USER_ID, { fixtureId: FIXTURE_ID, seatSelections: [{ seatId: SEAT_ID, ticketTypeId: TICKET_TYPE_ID }], paymentMethod: 'CARD' })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects a booking that references a ticket type id that does not exist', async () => {
    vi.mocked(prisma.fixture.findUnique).mockResolvedValue({ id: FIXTURE_ID } as never);
    vi.mocked(prisma.match.upsert).mockResolvedValue({ id: 'match-1', fixtureId: FIXTURE_ID } as never);
    vi.mocked(prisma.ticketType.findMany).mockResolvedValue([]); // none found, but 1 was requested

    await expect(
      createBooking(USER_ID, { fixtureId: FIXTURE_ID, seatSelections: [{ seatId: SEAT_ID, ticketTypeId: TICKET_TYPE_ID }], paymentMethod: 'CARD' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a booking when the seat is already held by a VALID or USED ticket', async () => {
    vi.mocked(prisma.fixture.findUnique).mockResolvedValue({ id: FIXTURE_ID } as never);
    vi.mocked(prisma.match.upsert).mockResolvedValue({ id: 'match-1', fixtureId: FIXTURE_ID } as never);
    vi.mocked(prisma.ticketType.findMany).mockResolvedValue([{ id: TICKET_TYPE_ID, price: 25 }] as never);
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([{ id: 'existing-ticket', seatId: SEAT_ID, status: TicketStatus.VALID }] as never);

    await expect(
      createBooking(USER_ID, { fixtureId: FIXTURE_ID, seatSelections: [{ seatId: SEAT_ID, ticketTypeId: TICKET_TYPE_ID }], paymentMethod: 'CARD' })
    ).rejects.toMatchObject({ status: 409 });

    // The conflict must be caught before any charge is attempted.
    expect(charge).not.toHaveBeenCalled();
  });

  it('cancels the booking and surfaces a 400 when the mock gateway declines payment', async () => {
    vi.mocked(prisma.fixture.findUnique).mockResolvedValue({ id: FIXTURE_ID } as never);
    vi.mocked(prisma.match.upsert).mockResolvedValue({ id: 'match-1', fixtureId: FIXTURE_ID } as never);
    vi.mocked(prisma.ticketType.findMany).mockResolvedValue([{ id: TICKET_TYPE_ID, price: 25 }] as never);
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([]);
    vi.mocked(prisma.booking.create).mockResolvedValue({ id: 'booking-1', status: 'PENDING' } as never);
    vi.mocked(charge).mockResolvedValue({ status: PaymentStatus.FAILED, transactionRef: 'MOCK_DECLINED' });
    vi.mocked(prisma.payment.create).mockResolvedValue({ id: 'payment-1' } as never);
    vi.mocked(prisma.booking.update).mockResolvedValue({ id: 'booking-1', status: 'CANCELLED' } as never);

    await expect(
      createBooking(USER_ID, { fixtureId: FIXTURE_ID, seatSelections: [{ seatId: SEAT_ID, ticketTypeId: TICKET_TYPE_ID }], paymentMethod: 'CARD' })
    ).rejects.toMatchObject({ status: 400 });

    expect(prisma.booking.update).toHaveBeenCalledWith({ where: { id: 'booking-1' }, data: { status: 'CANCELLED' } });
    // No tickets should ever be created for a declined payment.
    expect(prisma.ticket.createMany).not.toHaveBeenCalled();
  });
});
