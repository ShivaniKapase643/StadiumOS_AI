import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ApiError, created, ok } from '../../utils/apiResponse';
import * as vendorService from './vendor.service';

const router = Router();
router.use(requireAuth);

const addItemSchema = z.object({
  body: z.object({ name: z.string().min(1).max(80), sku: z.string().min(1).max(30), stock: z.number().int().min(0), price: z.number().positive() }),
});
const updateItemSchema = z.object({
  body: z.object({ stock: z.number().int().min(0).optional(), price: z.number().positive().optional() }),
});
const updateOrderStatusSchema = z.object({
  body: z.object({ status: z.enum(['PLACED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']) }),
});

/**
 * @openapi
 * /vendor/all:
 *   get:
 *     summary: "Admin summary of all vendors"
 *     tags: [Vendor]
 */
router.get(
  '/all',
  requireRole(Role.SUPER_ADMIN, Role.STADIUM_ADMIN),
  asyncHandler(async (_req, res) => ok(res, await vendorService.listAllVendorsSummary()))
);

/**
 * @openapi
 * /vendor/me:
 *   get:
 *     summary: "Get the current vendor's profile"
 *     tags: [Vendor]
 */
router.get(
  '/me',
  requireRole(Role.VENDOR),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await vendorService.getMyVendor(req.user.sub));
  })
);

/**
 * @openapi
 * /vendor/inventory:
 *   get:
 *     summary: "List the current vendor's inventory"
 *     tags: [Vendor]
 */
router.get(
  '/inventory',
  requireRole(Role.VENDOR),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await vendorService.getMyInventory(req.user.sub));
  })
);

/**
 * @openapi
 * /vendor/inventory:
 *   post:
 *     summary: "Add an inventory item"
 *     tags: [Vendor]
 */
router.post(
  '/inventory',
  requireRole(Role.VENDOR),
  validate(addItemSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    created(res, await vendorService.addInventoryItem(req.user.sub, req.body));
  })
);

/**
 * @openapi
 * /vendor/inventory/{id}:
 *   patch:
 *     summary: "Update stock/price for an inventory item"
 *     tags: [Vendor]
 */
router.patch(
  '/inventory/:id',
  requireRole(Role.VENDOR),
  validate(updateItemSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await vendorService.updateInventoryItem(req.user.sub, req.params.id, req.body));
  })
);

/**
 * @openapi
 * /vendor/orders:
 *   get:
 *     summary: "List the current vendor's incoming orders"
 *     tags: [Vendor]
 */
router.get(
  '/orders',
  requireRole(Role.VENDOR),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await vendorService.getMyOrders(req.user.sub));
  })
);

/**
 * @openapi
 * /vendor/orders/{id}/status:
 *   patch:
 *     summary: "Update an order's fulfillment status"
 *     tags: [Vendor]
 */
router.patch(
  '/orders/:id/status',
  requireRole(Role.VENDOR),
  validate(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await vendorService.updateOrderStatus(req.user.sub, req.params.id, req.body.status));
  })
);

/**
 * @openapi
 * /vendor/analytics:
 *   get:
 *     summary: "Revenue analytics for the current vendor"
 *     tags: [Vendor]
 */
router.get(
  '/analytics',
  requireRole(Role.VENDOR),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await vendorService.getMyAnalytics(req.user.sub));
  })
);

export default router;
