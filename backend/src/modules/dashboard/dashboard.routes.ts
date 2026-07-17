import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import {
  kpisHandler,
  attendanceTrendHandler,
  revenueTrendHandler,
  crowdByZoneHandler,
  ticketTierSplitHandler,
  upcomingMatchesHandler,
  recentActivityHandler,
} from './dashboard.controller';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /dashboard/kpis:
 *   get:
 *     summary: Get real-time executive KPIs (attendance, revenue, crowd, parking, energy, security, emergency, maintenance, weather)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/kpis', asyncHandler(kpisHandler));

/**
 * @openapi
 * /dashboard/attendance-trend:
 *   get:
 *     summary: Attendance trend time series
 *     tags: [Dashboard]
 */
router.get('/attendance-trend', asyncHandler(attendanceTrendHandler));

/**
 * @openapi
 * /dashboard/revenue-trend:
 *   get:
 *     summary: Revenue trend time series
 *     tags: [Dashboard]
 */
router.get('/revenue-trend', asyncHandler(revenueTrendHandler));

/**
 * @openapi
 * /dashboard/crowd-by-zone:
 *   get:
 *     summary: Latest crowd density per zone
 *     tags: [Dashboard]
 */
router.get('/crowd-by-zone', asyncHandler(crowdByZoneHandler));

/**
 * @openapi
 * /dashboard/ticket-tier-split:
 *   get:
 *     summary: Ticket sales split by tier
 *     tags: [Dashboard]
 */
router.get('/ticket-tier-split', asyncHandler(ticketTierSplitHandler));

/**
 * @openapi
 * /dashboard/upcoming-matches:
 *   get:
 *     summary: Upcoming fixtures
 *     tags: [Dashboard]
 */
router.get('/upcoming-matches', asyncHandler(upcomingMatchesHandler));

/**
 * @openapi
 * /dashboard/recent-activity:
 *   get:
 *     summary: Recent audit log activity feed
 *     tags: [Dashboard]
 */
router.get('/recent-activity', asyncHandler(recentActivityHandler));

export default router;
