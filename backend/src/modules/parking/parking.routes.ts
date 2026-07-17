import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ApiError, created, ok } from '../../utils/apiResponse';
import * as parkingService from './parking.service';
import { logAudit } from '../users/audit.service';

const router = Router();
router.use(requireAuth);

const createReservationSchema = z.object({
  body: z.object({
    slotId: z.string().uuid(),
    vehicleNumber: z.string().min(2).max(20),
    startTime: z.coerce.date(),
    endTime: z.coerce.date().optional(),
  }),
});

/**
 * @openapi
 * /parking/lots:
 *   get:
 *     summary: "List parking lots with live slot status"
 *     tags: [Parking]
 */
router.get(
  '/lots',
  asyncHandler(async (_req, res) => ok(res, await parkingService.listLots()))
);

/**
 * @openapi
 * /parking/analytics:
 *   get:
 *     summary: "Parking occupancy analytics per lot"
 *     tags: [Parking]
 */
router.get(
  '/analytics',
  asyncHandler(async (_req, res) => ok(res, await parkingService.getParkingAnalytics()))
);

/**
 * @openapi
 * /parking/reservations:
 *   get:
 *     summary: "Get the current user's parking reservations"
 *     tags: [Parking]
 */
router.get(
  '/reservations',
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await parkingService.getMyReservations(req.user.sub));
  })
);

/**
 * @openapi
 * /parking/reservations:
 *   post:
 *     summary: "Reserve a parking slot"
 *     tags: [Parking]
 */
router.post(
  '/reservations',
  validate(createReservationSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const reservation = await parkingService.createReservation(req.user.sub, req.body);
    await logAudit(req.user.sub, 'CREATE_PARKING_RESERVATION', 'ParkingReservation', reservation.id);
    created(res, reservation);
  })
);

/**
 * @openapi
 * /parking/reservations/{id}:
 *   delete:
 *     summary: "Cancel a parking reservation"
 *     tags: [Parking]
 */
router.delete(
  '/reservations/:id',
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    await parkingService.cancelReservation(req.user.sub, req.params.id);
    ok(res, { message: 'Reservation cancelled' });
  })
);

export default router;
