import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { Role } from '@prisma/client';
import {
  createSeatsSchema,
  createTicketTypeSchema,
  createBookingSchema,
  requestRefundSchema,
  verifyTicketSchema,
} from './ticketing.validation';
import {
  bulkCreateSeatsHandler,
  createTicketTypeHandler,
  listAvailableSeatsHandler,
  createBookingHandler,
  myTicketsHandler,
  requestRefundHandler,
  verifyTicketHandler,
} from './ticketing.controller';

const router = Router();
router.use(requireAuth);

const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.STADIUM_ADMIN];
const SCANNER_ROLES = [...ADMIN_ROLES, Role.SECURITY_OFFICER, Role.VOLUNTEER];

/**
 * @openapi
 * /ticketing/seats:
 *   post:
 *     summary: "Bulk-create a seat grid for a stadium section"
 *     tags: [Ticketing]
 */
router.post('/seats', requireRole(...ADMIN_ROLES), validate(createSeatsSchema), asyncHandler(bulkCreateSeatsHandler));

/**
 * @openapi
 * /ticketing/ticket-types:
 *   post:
 *     summary: "Create a ticket type/tier for a fixture"
 *     tags: [Ticketing]
 */
router.post(
  '/ticket-types',
  requireRole(...ADMIN_ROLES, Role.TOURNAMENT_ORGANIZER),
  validate(createTicketTypeSchema),
  asyncHandler(createTicketTypeHandler)
);

/**
 * @openapi
 * /ticketing/fixtures/{fixtureId}/seats:
 *   get:
 *     summary: "List seat availability for a fixture"
 *     tags: [Ticketing]
 */
router.get('/fixtures/:fixtureId/seats', asyncHandler(listAvailableSeatsHandler));

/**
 * @openapi
 * /ticketing/bookings:
 *   post:
 *     summary: "Book seats (mock payment + QR ticket issuance)"
 *     tags: [Ticketing]
 */
router.post('/bookings', validate(createBookingSchema), asyncHandler(createBookingHandler));

/**
 * @openapi
 * /ticketing/my-tickets:
 *   get:
 *     summary: "Get the current user's tickets with QR codes"
 *     tags: [Ticketing]
 */
router.get('/my-tickets', asyncHandler(myTicketsHandler));

/**
 * @openapi
 * /ticketing/refunds:
 *   post:
 *     summary: "Request a refund for a valid, unused ticket"
 *     tags: [Ticketing]
 */
router.post('/refunds', validate(requestRefundSchema), asyncHandler(requestRefundHandler));

/**
 * @openapi
 * /ticketing/scan:
 *   post:
 *     summary: "Verify and check in a scanned QR ticket"
 *     tags: [Ticketing]
 */
router.post('/scan', requireRole(...SCANNER_ROLES), validate(verifyTicketSchema), asyncHandler(verifyTicketHandler));

export default router;
