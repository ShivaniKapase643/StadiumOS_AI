import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ApiError, created, ok, paginated } from '../../utils/apiResponse';
import { parsePagination } from '../../utils/pagination';
import * as securityService from './security.service';
import { logAudit } from '../users/audit.service';

const router = Router();
router.use(requireAuth);

const SECURITY_ROLES = [Role.SUPER_ADMIN, Role.STADIUM_ADMIN, Role.SECURITY_OFFICER];

const createIncidentSchema = z.object({
  body: z.object({
    type: z.string().min(2).max(80),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    description: z.string().min(3).max(500),
    zoneId: z.string().uuid().optional(),
  }),
});
const updateIncidentSchema = z.object({
  body: z.object({ status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']), assignedToId: z.string().uuid().optional() }),
});
const createPatrolLogSchema = z.object({ body: z.object({ zoneId: z.string().uuid(), notes: z.string().max(300).optional() }) });
const createBroadcastSchema = z.object({
  body: z.object({
    message: z.string().min(3).max(500),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    audienceRoles: z.array(z.nativeEnum(Role)).default([]),
  }),
});

/**
 * @openapi
 * /security/incidents:
 *   get:
 *     summary: "List security incidents"
 *     tags: [Security]
 */
router.get(
  '/incidents',
  requireRole(...SECURITY_ROLES),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = parsePagination(req);
    const result = await securityService.listIncidents(page, pageSize);
    paginated(res, result.items, { total: result.total, page: result.page, pageSize: result.pageSize });
  })
);

/**
 * @openapi
 * /security/incidents:
 *   post:
 *     summary: "Report a security incident"
 *     tags: [Security]
 */
router.post(
  '/incidents',
  requireRole(...SECURITY_ROLES, Role.VOLUNTEER),
  validate(createIncidentSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const incident = await securityService.createIncident(req.user.sub, req.body);
    await logAudit(req.user.sub, 'CREATE_INCIDENT', 'Incident', incident.id);
    created(res, incident);
  })
);

/**
 * @openapi
 * /security/incidents/{id}:
 *   patch:
 *     summary: "Update incident status/assignment"
 *     tags: [Security]
 */
router.patch(
  '/incidents/:id',
  requireRole(...SECURITY_ROLES),
  validate(updateIncidentSchema),
  asyncHandler(async (req, res) => ok(res, await securityService.updateIncidentStatus(req.params.id, req.body.status, req.body.assignedToId)))
);

/**
 * @openapi
 * /security/cctv:
 *   get:
 *     summary: "List CCTV cameras"
 *     tags: [Security]
 */
router.get('/cctv', requireRole(...SECURITY_ROLES), asyncHandler(async (_req, res) => ok(res, await securityService.listCameras())));

/**
 * @openapi
 * /security/patrol-logs:
 *   get:
 *     summary: "List recent patrol logs"
 *     tags: [Security]
 */
router.get('/patrol-logs', requireRole(...SECURITY_ROLES), asyncHandler(async (_req, res) => ok(res, await securityService.listPatrolLogs())));

/**
 * @openapi
 * /security/patrol-logs:
 *   post:
 *     summary: "Log a patrol checkpoint"
 *     tags: [Security]
 */
router.post(
  '/patrol-logs',
  requireRole(...SECURITY_ROLES),
  validate(createPatrolLogSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    created(res, await securityService.createPatrolLog(req.user.sub, req.body));
  })
);

/**
 * @openapi
 * /security/broadcasts:
 *   post:
 *     summary: "Send an emergency broadcast to targeted roles"
 *     tags: [Security]
 */
router.post(
  '/broadcasts',
  requireRole(...SECURITY_ROLES),
  validate(createBroadcastSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const broadcast = await securityService.createBroadcast(req.user.sub, req.body);
    await logAudit(req.user.sub, 'SEND_BROADCAST', 'EmergencyBroadcast', broadcast.id);
    created(res, broadcast);
  })
);

/**
 * @openapi
 * /security/broadcasts:
 *   get:
 *     summary: "List past emergency broadcasts"
 *     tags: [Security]
 */
router.get('/broadcasts', requireRole(...SECURITY_ROLES), asyncHandler(async (_req, res) => ok(res, await securityService.listBroadcasts())));

export default router;
