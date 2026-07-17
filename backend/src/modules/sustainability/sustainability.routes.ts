import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { ok, ApiError } from '../../utils/apiResponse';
import { prisma } from '../../config/db';
import { getSustainabilitySummary } from './sustainability.service';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /sustainability/summary:
 *   get:
 *     summary: "Energy/water/waste/carbon summary for the stadium"
 *     tags: [Sustainability]
 */
router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const stadium = await prisma.stadium.findFirst();
    if (!stadium) throw ApiError.notFound('No stadium configured');
    ok(res, await getSustainabilitySummary(stadium.id));
  })
);

export default router;
