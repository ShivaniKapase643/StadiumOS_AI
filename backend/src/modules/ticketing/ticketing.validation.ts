import { z } from 'zod';
import { SeatTier, PaymentMethod } from '@prisma/client';

export const createSeatsSchema = z.object({
  body: z.object({
    stadiumId: z.string().uuid(),
    section: z.string().min(1).max(20),
    rows: z.number().int().min(1).max(50),
    seatsPerRow: z.number().int().min(1).max(50),
    tier: z.nativeEnum(SeatTier),
  }),
});

export const createTicketTypeSchema = z.object({
  body: z.object({
    fixtureId: z.string().uuid(),
    name: z.string().min(1).max(50),
    tier: z.nativeEnum(SeatTier),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
  }),
});

export const createBookingSchema = z.object({
  body: z.object({
    fixtureId: z.string().uuid(),
    seatSelections: z
      .array(z.object({ seatId: z.string().uuid(), ticketTypeId: z.string().uuid() }))
      .min(1)
      .max(10),
    paymentMethod: z.nativeEnum(PaymentMethod),
  }),
});

export const requestRefundSchema = z.object({
  body: z.object({
    ticketId: z.string().uuid(),
    reason: z.string().max(300).optional(),
  }),
});

export const verifyTicketSchema = z.object({
  body: z.object({
    code: z.string().min(10),
  }),
});
