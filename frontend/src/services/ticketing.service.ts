import { api } from './api';
import type { PaymentMethod, Seat, Ticket, TicketType } from '@/types';

export async function getSeatsForFixture(fixtureId: string) {
  const { data } = await api.get<{ data: { seats: Seat[]; ticketTypes: TicketType[] } }>(`/ticketing/fixtures/${fixtureId}/seats`);
  return data.data;
}

export async function createBooking(input: {
  fixtureId: string;
  seatSelections: Array<{ seatId: string; ticketTypeId: string }>;
  paymentMethod: PaymentMethod;
}) {
  const { data } = await api.post('/ticketing/bookings', input);
  return data.data as { booking: unknown; payment: unknown; tickets: Ticket[] };
}

export async function getMyTickets() {
  const { data } = await api.get<{ data: Ticket[] }>('/ticketing/my-tickets');
  return data.data;
}

export async function requestRefund(ticketId: string, reason?: string) {
  const { data } = await api.post('/ticketing/refunds', { ticketId, reason });
  return data.data;
}

export async function verifyTicket(code: string) {
  const { data } = await api.post<{ data: { ticket: Ticket; seat: Seat } }>('/ticketing/scan', { code });
  return data.data;
}
