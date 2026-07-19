import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { ApiError, ok } from '../../utils/apiResponse';
import { getReport, getFullEventReport, type ReportType } from './reports.service';

const router = Router();
router.use(requireAuth);

const VALID_TYPES: ReportType[] = ['attendance', 'revenue', 'crowd', 'security', 'vendor', 'parking', 'maintenance'];

/**
 * @openapi
 * /reports/full-event-report:
 *   get:
 *     summary: "AI Report Generator — one consolidated report combining every section plus AI insights and the health score"
 *     tags: [Reports]
 */
router.get(
  '/full-event-report',
  requireRole(Role.SUPER_ADMIN, Role.STADIUM_ADMIN, Role.TOURNAMENT_ORGANIZER, Role.SECURITY_OFFICER),
  asyncHandler(async (_req, res) => ok(res, await getFullEventReport()))
);

/**
 * @openapi
 * /reports/{type}:
 *   get:
 *     summary: "Get a tabular report by type"
 *     tags: [Reports]
 */
router.get(
  '/:type',
  requireRole(Role.SUPER_ADMIN, Role.STADIUM_ADMIN, Role.TOURNAMENT_ORGANIZER, Role.SECURITY_OFFICER),
  asyncHandler(async (req, res) => {
    const type = req.params.type as ReportType;
    if (!VALID_TYPES.includes(type)) throw ApiError.badRequest(`Unknown report type: ${type}`);
    ok(res, await getReport(type));
  })
);

export default router;
