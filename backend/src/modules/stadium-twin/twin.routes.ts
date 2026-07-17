import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { Role } from '@prisma/client';
import { createZoneSchema, updateZoneStatusSchema } from './twin.validation';
import {
  overviewHandler,
  listZonesHandler,
  createZoneHandler,
  updateZoneStatusHandler,
  deleteZoneHandler,
  liveSnapshotHandler,
} from './twin.controller';

const router = Router();
router.use(requireAuth);

const MANAGE_ROLES = [Role.SUPER_ADMIN, Role.STADIUM_ADMIN];

/**
 * @openapi
 * /twin/overview:
 *   get:
 *     summary: Get stadium overview (map metadata, capacity)
 *     tags: [Digital Twin]
 */
router.get('/overview', asyncHandler(overviewHandler));

/**
 * @openapi
 * /twin/stadiums/{stadiumId}/zones:
 *   get:
 *     summary: List zones for a stadium (gates, parking, medical, food courts, etc.)
 *     tags: [Digital Twin]
 */
router.get('/stadiums/:stadiumId/zones', asyncHandler(listZonesHandler));

/**
 * @openapi
 * /twin/stadiums/{stadiumId}/live:
 *   get:
 *     summary: Get a live snapshot (zones, parking, equipment, active alerts) for the twin map
 *     tags: [Digital Twin]
 */
router.get('/stadiums/:stadiumId/live', asyncHandler(liveSnapshotHandler));

/**
 * @openapi
 * /twin/zones:
 *   post:
 *     summary: Create a stadium zone
 *     tags: [Digital Twin]
 */
router.post('/zones', requireRole(...MANAGE_ROLES), validate(createZoneSchema), asyncHandler(createZoneHandler));

/**
 * @openapi
 * /twin/zones/{zoneId}/status:
 *   patch:
 *     summary: Update a zone's operational status
 *     tags: [Digital Twin]
 */
router.patch(
  '/zones/:zoneId/status',
  requireRole(...MANAGE_ROLES, Role.MAINTENANCE_TEAM),
  validate(updateZoneStatusSchema),
  asyncHandler(updateZoneStatusHandler)
);

/**
 * @openapi
 * /twin/zones/{zoneId}:
 *   delete:
 *     summary: Delete a zone
 *     tags: [Digital Twin]
 */
router.delete('/zones/:zoneId', requireRole(...MANAGE_ROLES), asyncHandler(deleteZoneHandler));

export default router;
