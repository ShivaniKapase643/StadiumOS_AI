import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { ok } from '../../utils/apiResponse';
import { getCongestionOverview, getQueueMonitoring, getPeakHourAnalysis } from './crowd-intelligence.service';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /crowd-intelligence/congestion:
 *   get:
 *     summary: "Zone congestion prediction"
 *     tags: [Crowd Intelligence]
 */
router.get(
  '/congestion',
  asyncHandler(async (_req, res) => ok(res, await getCongestionOverview()))
);

/**
 * @openapi
 * /crowd-intelligence/queues:
 *   get:
 *     summary: "Gate queue monitoring"
 *     tags: [Crowd Intelligence]
 */
router.get(
  '/queues',
  asyncHandler(async (_req, res) => ok(res, await getQueueMonitoring()))
);

/**
 * @openapi
 * /crowd-intelligence/peak-hours:
 *   get:
 *     summary: "Peak-hour crowd analysis"
 *     tags: [Crowd Intelligence]
 */
router.get(
  '/peak-hours',
  asyncHandler(async (_req, res) => ok(res, await getPeakHourAnalysis()))
);

export default router;
