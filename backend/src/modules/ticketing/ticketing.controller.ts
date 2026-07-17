import { Request, Response } from 'express';
import * as ticketingService from './ticketing.service';
import { ApiError, created, ok } from '../../utils/apiResponse';

export async function bulkCreateSeatsHandler(req: Request, res: Response) {
  created(res, await ticketingService.bulkCreateSeats(req.body));
}

export async function createTicketTypeHandler(req: Request, res: Response) {
  created(res, await ticketingService.createTicketType(req.body));
}

export async function listAvailableSeatsHandler(req: Request, res: Response) {
  ok(res, await ticketingService.listAvailableSeats(req.params.fixtureId));
}

export async function createBookingHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await ticketingService.createBooking(req.user.sub, req.body);
  created(res, result);
}

export async function myTicketsHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  ok(res, await ticketingService.getMyTickets(req.user.sub));
}

export async function requestRefundHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  ok(res, await ticketingService.requestRefund(req.user.sub, req.body.ticketId, req.body.reason));
}

export async function verifyTicketHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  ok(res, await ticketingService.verifyAndScanTicket(req.body.code, req.user.sub));
}
