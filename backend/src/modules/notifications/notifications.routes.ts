import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ApiError, created, ok } from '../../utils/apiResponse';
import * as notificationsService from './notifications.service';
import { logAudit } from '../users/audit.service';

const router = Router();
router.use(requireAuth);

const broadcastSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(120),
    body: z.string().min(2).max(500),
    type: z.enum(['GENERAL', 'MATCH', 'BOOKING', 'EMERGENCY', 'MAINTENANCE']).default('GENERAL'),
    channel: z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH']).default('IN_APP'),
    audienceRoles: z.array(z.nativeEnum(Role)).default([]),
  }),
});

/**
 * @openapi
 * /notifications/mine:
 *   get:
 *     summary: "Get the current user's notifications"
 *     tags: [Notifications]
 */
router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await notificationsService.getMyNotifications(req.user.sub));
  })
);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     summary: "Mark a notification as read"
 *     tags: [Notifications]
 */
router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await notificationsService.markNotificationRead(req.user.sub, req.params.id));
  })
);

/**
 * @openapi
 * /notifications/read-all:
 *   post:
 *     summary: "Mark all notifications as read"
 *     tags: [Notifications]
 */
router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    await notificationsService.markAllRead(req.user.sub);
    ok(res, { message: 'All notifications marked read' });
  })
);

/**
 * @openapi
 * /notifications/broadcast:
 *   post:
 *     summary: "Broadcast a notification to targeted roles"
 *     tags: [Notifications]
 */
router.post(
  '/broadcast',
  requireRole(Role.SUPER_ADMIN, Role.STADIUM_ADMIN, Role.SECURITY_OFFICER),
  validate(broadcastSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const result = await notificationsService.broadcastNotification(req.body);
    await logAudit(req.user.sub, 'BROADCAST_NOTIFICATION', 'Notification', undefined, { title: req.body.title, count: result.recipientCount });
    created(res, result);
  })
);

/**
 * @openapi
 * /notifications/logs:
 *   get:
 *     summary: "Admin view of all sent notification logs"
 *     tags: [Notifications]
 */
router.get(
  '/logs',
  requireRole(Role.SUPER_ADMIN, Role.STADIUM_ADMIN),
  asyncHandler(async (_req, res) => ok(res, await notificationsService.getNotificationLogs()))
);

export default router;
