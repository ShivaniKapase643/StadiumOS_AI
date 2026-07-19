import { randomUUID } from 'crypto';
import { prisma } from '../../config/db';
import { ApiError } from '../../utils/apiResponse';
import { PaymentMethod, SeatTier, TicketStatus, BookingStatus, PaymentStatus, RefundStatus } from '@prisma/client';
import { buildSignedTicketCode, generateQrDataUrl, verifySignedTicketCode } from '../../utils/qrcode';
import { charge, processRefund } from './payment.service';
import { sendEmail } from '../../utils/email';
import { emitToAll } from '../../sockets';
import { SOCKET_EVENTS } from '../../sockets/events';

// ---------------------------------------------------------------------------
// Seats & ticket types (admin setup)
// ---------------------------------------------------------------------------

export async function bulkCreateSeats(input: {
  stadiumId: string;
  section: string;
  rows: number;
  seatsPerRow: number;
  tier: SeatTier;
}) {
  const rowsLetters = Array.from({ length: input.rows }, (_, i) => String.fromCharCode(65 + i));
  const data = rowsLetters.flatMap((row) =>
    Array.from({ length: input.seatsPerRow }, (_, i) => ({
      stadiumId: input.stadiumId,
      section: input.section,
      row,
      number: i + 1,
      tier: input.tier,
    }))
  );

  await prisma.seat.createMany({ data, skipDuplicates: true });
  return prisma.seat.findMany({ where: { stadiumId: input.stadiumId, section: input.section } });
}

export async function createTicketType(input: {
  fixtureId: string;
  name: string;
  tier: SeatTier;
  price: number;
  quantity: number;
}) {
  return prisma.ticketType.create({ data: input });
}

export async function listAvailableSeats(fixtureId: string) {
  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: { tournament: true, match: true },
  });
  if (!fixture) throw ApiError.notFound('Fixture not found');

  const [seats, ticketTypes, bookedTickets] = await Promise.all([
    prisma.seat.findMany({ where: { stadium: { tournaments: { some: { id: fixture.tournamentId } } } } }),
    prisma.ticketType.findMany({ where: { fixtureId } }),
    fixture.match
      ? prisma.ticket.findMany({
          where: { matchId: fixture.match.id, status: { in: [TicketStatus.VALID, TicketStatus.USED] } },
          select: { seatId: true },
        })
      : Promise.resolve([]),
  ]);

  const bookedSeatIds = new Set(bookedTickets.map((t) => t.seatId));

  return {
    seats: seats.map((s) => ({ ...s, isBooked: bookedSeatIds.has(s.id) })),
    ticketTypes,
  };
}

// ---------------------------------------------------------------------------
// Booking flow: seat selection -> mock payment -> QR ticket issuance
// ---------------------------------------------------------------------------

export async function createBooking(
  userId: string,
  input: { fixtureId: string; seatSelections: Array<{ seatId: string; ticketTypeId: string }>; paymentMethod: PaymentMethod }
) {
  const fixture = await prisma.fixture.findUnique({ where: { id: input.fixtureId } });
  if (!fixture) throw ApiError.notFound('Fixture not found');

  // A Match row must exist before tickets can reference it.
  const match = await prisma.match.upsert({
    where: { fixtureId: input.fixtureId },
    create: { fixtureId: input.fixtureId },
    update: {},
  });

  const ticketTypeIds = [...new Set(input.seatSelections.map((s) => s.ticketTypeId))];
  const ticketTypes = await prisma.ticketType.findMany({ where: { id: { in: ticketTypeIds } } });
  if (ticketTypes.length !== ticketTypeIds.length) throw ApiError.badRequest('Invalid ticket type');

  const existing = await prisma.ticket.findMany({
    where: {
      matchId: match.id,
      seatId: { in: input.seatSelections.map((s) => s.seatId) },
      status: { in: [TicketStatus.VALID, TicketStatus.USED] },
    },
  });
  if (existing.length > 0) throw ApiError.conflict('One or more selected seats are already booked');

  const priceById = new Map(ticketTypes.map((t) => [t.id, Number(t.price)]));
  const totalAmount = input.seatSelections.reduce((sum, s) => sum + (priceById.get(s.ticketTypeId) ?? 0), 0);

  const booking = await prisma.booking.create({
    data: { userId, totalAmount, status: BookingStatus.PENDING },
  });

  const chargeResult = await charge(totalAmount, input.paymentMethod);

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: totalAmount,
      method: input.paymentMethod,
      status: chargeResult.status,
      transactionRef: chargeResult.transactionRef,
    },
  });

  if (chargeResult.status !== PaymentStatus.SUCCESS) {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CANCELLED } });
    throw ApiError.badRequest('Payment failed. Please try again with a different payment method.');
  }

  // Ticket IDs are generated up front so the signed QR payload can be
  // computed before insertion, letting all tickets go in via one createMany
  // instead of N sequential create+update round-trips.
  const ticketRows = input.seatSelections.map((selection) => {
    const ticketId = randomUUID();
    return {
      id: ticketId,
      bookingId: booking.id,
      matchId: match.id,
      seatId: selection.seatId,
      ticketTypeId: selection.ticketTypeId,
      qrCode: buildSignedTicketCode({ ticketId, matchId: match.id, seatId: selection.seatId }),
    };
  });

  await prisma.ticket.createMany({ data: ticketRows });

  const soldCountByTicketType = new Map<string, number>();
  for (const selection of input.seatSelections) {
    soldCountByTicketType.set(selection.ticketTypeId, (soldCountByTicketType.get(selection.ticketTypeId) ?? 0) + 1);
  }

  const [confirmedBooking] = await Promise.all([
    prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CONFIRMED } }),
    ...Array.from(soldCountByTicketType.entries()).map(([ticketTypeId, count]) =>
      prisma.ticketType.update({ where: { id: ticketTypeId }, data: { sold: { increment: count } } })
    ),
  ]);

  const tickets = await prisma.ticket.findMany({ where: { id: { in: ticketRows.map((t) => t.id) } } });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await sendEmail(
      user.email,
      'Your Smart Stadium OS booking is confirmed',
      `<p>Hi ${user.name},</p><p>Your booking for ${tickets.length} ticket(s) totalling $${totalAmount.toFixed(2)} is confirmed. View your tickets in the "My Tickets" section of the app.</p>`
    );
    await prisma.notification.create({
      data: {
        userId,
        title: 'Booking confirmed',
        body: `${tickets.length} ticket(s) booked successfully.`,
        type: 'BOOKING',
      },
    });
  }

  return { booking: confirmedBooking, payment, tickets };
}

export async function getMyTickets(userId: string) {
  const tickets = await prisma.ticket.findMany({
    where: { booking: { userId } },
    include: { seat: true, ticketType: true, match: { include: { fixture: { include: { homeTeam: true, awayTeam: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    tickets.map(async (t) => ({ ...t, qrDataUrl: await generateQrDataUrl(t.qrCode) }))
  );
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export async function requestRefund(userId: string, ticketId: string, reason?: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { booking: { include: { payment: true } } },
  });
  if (!ticket || ticket.booking.userId !== userId) throw ApiError.notFound('Ticket not found');
  if (ticket.status !== TicketStatus.VALID) throw ApiError.badRequest('Only valid, unused tickets can be refunded');
  if (!ticket.booking.payment) throw ApiError.badRequest('No payment found for this booking');

  const ticketType = await prisma.ticketType.findUnique({ where: { id: ticket.ticketTypeId } });
  const amount = Number(ticketType?.price ?? 0);

  const result = await processRefund(amount);
  const refund = await prisma.refund.create({
    data: {
      paymentId: ticket.booking.payment.id,
      ticketId: ticket.id,
      amount,
      reason,
      status: result.status === 'PROCESSED' ? RefundStatus.PROCESSED : RefundStatus.REJECTED,
    },
  });

  if (result.status === 'PROCESSED') {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: TicketStatus.REFUNDED } });
    await prisma.ticketType.update({ where: { id: ticket.ticketTypeId }, data: { sold: { decrement: 1 } } });
  }

  return refund;
}

// ---------------------------------------------------------------------------
// Ticket Scanner — verify + check in
// ---------------------------------------------------------------------------

export async function verifyAndScanTicket(code: string, scannedByUserId: string) {
  const payload = verifySignedTicketCode(code);
  if (!payload) throw ApiError.badRequest('Invalid QR code — signature mismatch');

  const ticket = await prisma.ticket.findUnique({
    where: { id: payload.ticketId },
    include: { seat: true, match: { include: { fixture: true } } },
  });
  if (!ticket) throw ApiError.notFound('Ticket not found');

  if (ticket.status === TicketStatus.USED) {
    throw ApiError.conflict(`Ticket already checked in at ${ticket.checkedInAt?.toISOString()}`);
  }
  if (ticket.status !== TicketStatus.VALID) {
    throw ApiError.badRequest(`Ticket is ${ticket.status.toLowerCase()} and cannot be used`);
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: TicketStatus.USED, checkedInAt: new Date() },
  });

  emitToAll(SOCKET_EVENTS.TICKET_SCANNED, {
    ticketId: updated.id,
    seat: `${ticket.seat.section}-${ticket.seat.row}${ticket.seat.number}`,
    matchId: ticket.matchId,
    scannedByUserId,
    checkedInAt: updated.checkedInAt,
  });

  return { ticket: updated, seat: ticket.seat };
}
