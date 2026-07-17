import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ApiError, created, ok } from '../../utils/apiResponse';
import * as maintenanceService from './maintenance.service';

const router = Router();
router.use(requireAuth);

const MAINTENANCE_ROLES = [Role.SUPER_ADMIN, Role.STADIUM_ADMIN, Role.MAINTENANCE_TEAM];

const createWorkOrderSchema = z.object({
  body: z.object({
    assetId: z.string().uuid(),
    title: z.string().min(2).max(120),
    description: z.string().max(500).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    assignedToId: z.string().uuid().optional(),
    scheduledAt: z.coerce.date().optional(),
  }),
});
const updateWorkOrderStatusSchema = z.object({ body: z.object({ status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) }) });
const createInspectionSchema = z.object({
  body: z.object({ assetId: z.string().uuid(), findings: z.string().min(3).max(500), score: z.number().min(0).max(100) }),
});

/**
 * @openapi
 * /maintenance/assets:
 *   get:
 *     summary: "List assets"
 *     tags: [Maintenance]
 */
router.get('/assets', requireRole(...MAINTENANCE_ROLES), asyncHandler(async (_req, res) => ok(res, await maintenanceService.listAssets())));

/**
 * @openapi
 * /maintenance/work-orders:
 *   get:
 *     summary: "List work orders"
 *     tags: [Maintenance]
 */
router.get('/work-orders', requireRole(...MAINTENANCE_ROLES), asyncHandler(async (_req, res) => ok(res, await maintenanceService.listWorkOrders())));

/**
 * @openapi
 * /maintenance/work-orders:
 *   post:
 *     summary: "Create a work order"
 *     tags: [Maintenance]
 */
router.post(
  '/work-orders',
  requireRole(...MAINTENANCE_ROLES),
  validate(createWorkOrderSchema),
  asyncHandler(async (req, res) => created(res, await maintenanceService.createWorkOrder(req.body)))
);

/**
 * @openapi
 * /maintenance/work-orders/{id}/status:
 *   patch:
 *     summary: "Update work order status"
 *     tags: [Maintenance]
 */
router.patch(
  '/work-orders/:id/status',
  requireRole(...MAINTENANCE_ROLES),
  validate(updateWorkOrderStatusSchema),
  asyncHandler(async (req, res) => ok(res, await maintenanceService.updateWorkOrderStatus(req.params.id, req.body.status)))
);

/**
 * @openapi
 * /maintenance/inspections:
 *   get:
 *     summary: "List inspection reports"
 *     tags: [Maintenance]
 */
router.get(
  '/inspections',
  requireRole(...MAINTENANCE_ROLES),
  asyncHandler(async (_req, res) => ok(res, await maintenanceService.listInspectionReports()))
);

/**
 * @openapi
 * /maintenance/inspections:
 *   post:
 *     summary: "File an inspection report"
 *     tags: [Maintenance]
 */
router.post(
  '/inspections',
  requireRole(...MAINTENANCE_ROLES),
  validate(createInspectionSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    created(res, await maintenanceService.createInspectionReport(req.user.sub, req.body));
  })
);

/**
 * @openapi
 * /maintenance/predictions:
 *   get:
 *     summary: "Get latest predictive-maintenance risk scores"
 *     tags: [Maintenance]
 */
router.get(
  '/predictions',
  requireRole(...MAINTENANCE_ROLES),
  asyncHandler(async (_req, res) => ok(res, await maintenanceService.listLatestPredictions()))
);

/**
 * @openapi
 * /maintenance/predictions/recompute:
 *   post:
 *     summary: "Recompute predictive-maintenance risk scores"
 *     tags: [Maintenance]
 */
router.post(
  '/predictions/recompute',
  requireRole(...MAINTENANCE_ROLES),
  asyncHandler(async (_req, res) => created(res, await maintenanceService.recomputePredictions()))
);

export default router;
