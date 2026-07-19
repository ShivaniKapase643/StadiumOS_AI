import { Router } from 'express';
import { z } from 'zod';
import { SeatTier } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { Role } from '@prisma/client';
import { ApiError, created, ok, paginated } from '../../utils/apiResponse';
import { parsePagination } from '../../utils/pagination';
import * as fanService from './fan-experience.service';

const router = Router();
router.use(requireAuth);

const STAFF_ROLES = [Role.SUPER_ADMIN, Role.STADIUM_ADMIN, Role.VOLUNTEER, Role.SECURITY_OFFICER];

const createLostFoundSchema = z.object({
  body: z.object({ description: z.string().min(3).max(300), category: z.string().min(2).max(50), location: z.string().max(100).optional() }),
});
const updateLostFoundSchema = z.object({
  body: z.object({ status: z.enum(['REPORTED', 'MATCHED', 'CLAIMED', 'CLOSED']) }),
});
const createFoodOrderSchema = z.object({
  body: z.object({
    vendorId: z.string().uuid(),
    items: z
      .array(z.object({ inventoryItemId: z.string().uuid(), name: z.string(), price: z.number().positive(), quantity: z.number().int().positive() }))
      .min(1),
  }),
});

/**
 * @openapi
 * /fan-experience/lost-found:
 *   get:
 *     summary: "List lost & found items"
 *     tags: [Fan Experience]
 */
router.get(
  '/lost-found',
  asyncHandler(async (req, res) => {
    const { page, pageSize } = parsePagination(req);
    const result = await fanService.listLostFoundItems(page, pageSize);
    paginated(res, result.items, { total: result.total, page: result.page, pageSize: result.pageSize });
  })
);

/**
 * @openapi
 * /fan-experience/lost-found:
 *   post:
 *     summary: "Report a lost item"
 *     tags: [Fan Experience]
 */
router.post(
  '/lost-found',
  validate(createLostFoundSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    created(res, await fanService.createLostFoundItem(req.user.sub, req.body));
  })
);

/**
 * @openapi
 * /fan-experience/lost-found/{id}/status:
 *   patch:
 *     summary: "Update lost & found item status"
 *     tags: [Fan Experience]
 */
router.patch(
  '/lost-found/:id/status',
  requireRole(...STAFF_ROLES),
  validate(updateLostFoundSchema),
  asyncHandler(async (req, res) => ok(res, await fanService.updateLostFoundStatus(req.params.id, req.body.status)))
);

/**
 * @openapi
 * /fan-experience/vendors:
 *   get:
 *     summary: "List active vendors with inventory for food ordering"
 *     tags: [Fan Experience]
 */
router.get('/vendors', asyncHandler(async (_req, res) => ok(res, await fanService.listActiveVendors())));

/**
 * @openapi
 * /fan-experience/food-orders:
 *   post:
 *     summary: "Place a food order"
 *     tags: [Fan Experience]
 */
router.post(
  '/food-orders',
  validate(createFoodOrderSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    created(res, await fanService.createFoodOrder(req.user.sub, req.body));
  })
);

/**
 * @openapi
 * /fan-experience/food-orders/mine:
 *   get:
 *     summary: "Get the current user's food orders"
 *     tags: [Fan Experience]
 */
router.get(
  '/food-orders/mine',
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await fanService.getMyFoodOrders(req.user.sub));
  })
);

/**
 * @openapi
 * /fan-experience/seat-finder:
 *   get:
 *     summary: "Search seats by tier/section"
 *     tags: [Fan Experience]
 */
router.get(
  '/seat-finder',
  asyncHandler(async (req, res) => {
    const tier = req.query.tier as SeatTier | undefined;
    const section = req.query.section as string | undefined;
    const row = req.query.row as string | undefined;
    const number = req.query.number ? Number(req.query.number) : undefined;
    ok(res, await fanService.findSeats({ tier, section, row, number }));
  })
);

export default router;
