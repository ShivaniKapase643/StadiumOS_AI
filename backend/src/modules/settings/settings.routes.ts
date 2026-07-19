import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole, ADMIN_ROLES } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ApiError, created, ok, paginated } from '../../utils/apiResponse';
import { parsePagination } from '../../utils/pagination';
import { prisma } from '../../config/db';
import * as settingsService from './settings.service';
import { logAudit } from '../users/audit.service';

const router = Router();
router.use(requireAuth);

const updateOrgSchema = z.object({ body: z.object({ name: z.string().min(2).max(150).optional(), logoUrl: z.string().url().optional() }) });
const updateRoleSchema = z.object({ body: z.object({ role: z.nativeEnum(Role) }) });
const toggleActiveSchema = z.object({ body: z.object({ isActive: z.boolean() }) });
const createApiKeySchema = z.object({ body: z.object({ name: z.string().min(2).max(80), scopes: z.array(z.string()).default(['read']) }) });

async function currentOrgId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.organizationId) throw ApiError.badRequest('No organization associated with this user');
  return user.organizationId;
}

/**
 * @openapi
 * /settings/organization:
 *   get:
 *     summary: "Get organization details"
 *     tags: [Settings]
 */
router.get(
  '/organization',
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await settingsService.getOrganization(await currentOrgId(req.user.sub)));
  })
);

/**
 * @openapi
 * /settings/organization:
 *   patch:
 *     summary: "Update organization details"
 *     tags: [Settings]
 */
router.patch(
  '/organization',
  requireRole(...ADMIN_ROLES),
  validate(updateOrgSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await settingsService.updateOrganization(await currentOrgId(req.user.sub), req.body));
  })
);

/**
 * @openapi
 * /settings/users:
 *   get:
 *     summary: "List all users"
 *     tags: [Settings]
 */
router.get(
  '/users',
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = parsePagination(req);
    const result = await settingsService.listUsers(page, pageSize);
    paginated(res, result.items, { total: result.total, page: result.page, pageSize: result.pageSize });
  })
);

/**
 * @openapi
 * /settings/users/{id}/role:
 *   patch:
 *     summary: "Change a user's role"
 *     tags: [Settings]
 */
router.patch(
  '/users/:id/role',
  requireRole(Role.SUPER_ADMIN),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const user = await settingsService.updateUserRole(req.params.id, req.body.role);
    await logAudit(req.user.sub, 'UPDATE_USER_ROLE', 'User', user.id, { role: req.body.role });
    ok(res, user);
  })
);

/**
 * @openapi
 * /settings/users/{id}/active:
 *   patch:
 *     summary: "Activate/deactivate a user"
 *     tags: [Settings]
 */
router.patch(
  '/users/:id/active',
  requireRole(...ADMIN_ROLES),
  validate(toggleActiveSchema),
  asyncHandler(async (req, res) => ok(res, await settingsService.toggleUserActive(req.params.id, req.body.isActive)))
);

/**
 * @openapi
 * /settings/api-keys:
 *   get:
 *     summary: "List API keys"
 *     tags: [Settings]
 */
router.get(
  '/api-keys',
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await settingsService.listApiKeys(await currentOrgId(req.user.sub)));
  })
);

/**
 * @openapi
 * /settings/api-keys:
 *   post:
 *     summary: "Generate a new API key"
 *     tags: [Settings]
 */
router.post(
  '/api-keys',
  requireRole(...ADMIN_ROLES),
  validate(createApiKeySchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const key = await settingsService.createApiKey(await currentOrgId(req.user.sub), req.body);
    await logAudit(req.user.sub, 'CREATE_API_KEY', 'ApiKey', key.id);
    created(res, key);
  })
);

/**
 * @openapi
 * /settings/api-keys/{id}:
 *   delete:
 *     summary: "Revoke an API key"
 *     tags: [Settings]
 */
router.delete(
  '/api-keys/:id',
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await settingsService.revokeApiKey(await currentOrgId(req.user.sub), req.params.id));
  })
);

/**
 * @openapi
 * /settings/audit-logs:
 *   get:
 *     summary: "Paginated audit log"
 *     tags: [Settings]
 */
router.get(
  '/audit-logs',
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = parsePagination(req);
    const result = await settingsService.getAuditLogs(page, pageSize);
    paginated(res, result.items, { total: result.total, page: result.page, pageSize: result.pageSize });
  })
);

export default router;
