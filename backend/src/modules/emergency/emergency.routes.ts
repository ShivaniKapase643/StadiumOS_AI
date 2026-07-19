import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole, ADMIN_ROLES } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ApiError, created, ok } from '../../utils/apiResponse';
import * as emergencyService from './emergency.service';
import { generateIncidentActionPlan, simulateEvacuation } from './aiResponse.service';
import { logAudit } from '../users/audit.service';

const router = Router();
router.use(requireAuth);

const RESPONDER_ROLES = [...ADMIN_ROLES, Role.SECURITY_OFFICER, Role.MEDICAL_TEAM];

const createSosSchema = z.object({ body: z.object({ type: z.enum(['MEDICAL', 'FIRE', 'SECURITY', 'OTHER']), zoneId: z.string().uuid().optional() }) });
const dispatchSchema = z.object({ body: z.object({ driverName: z.string().max(80).optional() }) });

/**
 * @openapi
 * /emergency/sos:
 *   get:
 *     summary: "List SOS alerts"
 *     tags: [Emergency]
 */
router.get('/sos', requireRole(...RESPONDER_ROLES), asyncHandler(async (_req, res) => ok(res, await emergencyService.listSosAlerts())));

/**
 * @openapi
 * /emergency/sos:
 *   post:
 *     summary: "Raise an SOS alert"
 *     tags: [Emergency]
 */
router.post(
  '/sos',
  validate(createSosSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const alert = await emergencyService.createSosAlert(req.user.sub, req.body);
    await logAudit(req.user.sub, 'CREATE_SOS_ALERT', 'SOSAlert', alert.id);
    created(res, alert);
  })
);

/**
 * @openapi
 * /emergency/sos/{id}/dispatch:
 *   post:
 *     summary: "Dispatch an ambulance for an SOS alert"
 *     tags: [Emergency]
 */
router.post(
  '/sos/:id/dispatch',
  requireRole(...RESPONDER_ROLES),
  validate(dispatchSchema),
  asyncHandler(async (req, res) => created(res, await emergencyService.dispatchAmbulance(req.params.id, req.body.driverName)))
);

/**
 * @openapi
 * /emergency/sos/{id}/resolve:
 *   post:
 *     summary: "Resolve an SOS alert"
 *     tags: [Emergency]
 */
router.post(
  '/sos/:id/resolve',
  requireRole(...RESPONDER_ROLES),
  asyncHandler(async (req, res) => ok(res, await emergencyService.resolveSosAlert(req.params.id)))
);

/**
 * @openapi
 * /emergency/evacuation-plans:
 *   get:
 *     summary: "List evacuation plans"
 *     tags: [Emergency]
 */
router.get(
  '/evacuation-plans',
  requireRole(...RESPONDER_ROLES),
  asyncHandler(async (_req, res) => ok(res, await emergencyService.listEvacuationPlans()))
);

/**
 * @openapi
 * /emergency/sos/{id}/action-plan:
 *   get:
 *     summary: "AI Incident Commander — generate a rule-based response action plan for an SOS alert"
 *     tags: [Emergency]
 */
router.get(
  '/sos/:id/action-plan',
  requireRole(...RESPONDER_ROLES),
  asyncHandler(async (req, res) => ok(res, await generateIncidentActionPlan(req.params.id)))
);

/**
 * @openapi
 * /emergency/evacuation-simulate/{zoneId}:
 *   get:
 *     summary: "Smart Evacuation Simulator — fastest and congestion-aware alternative exit routes from a zone"
 *     tags: [Emergency]
 */
router.get(
  '/evacuation-simulate/:zoneId',
  requireRole(...RESPONDER_ROLES),
  asyncHandler(async (req, res) => ok(res, await simulateEvacuation(req.params.zoneId)))
);

export default router;
