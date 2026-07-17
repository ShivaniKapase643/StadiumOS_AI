import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { env } from '../../config/env';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  meHandler,
} from './auth.controller';

const router = Router();

// Tighter in production (real brute-force protection); generous in dev so
// repeated manual logins while testing/demoing never lock you out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new self-service account (Fan, Volunteer, or Vendor)
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: Account created
 */
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(registerHandler));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Access + refresh tokens issued
 */
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(loginHandler));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Exchange a refresh token for a new token pair
 *     tags: [Auth]
 */
router.post('/refresh', validate(refreshSchema), asyncHandler(refreshHandler));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke a refresh token
 *     tags: [Auth]
 */
router.post('/logout', validate(refreshSchema), asyncHandler(logoutHandler));

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 */
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(forgotPasswordHandler));

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using a valid reset token
 *     tags: [Auth]
 */
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(resetPasswordHandler));

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', requireAuth, asyncHandler(meHandler));

export default router;
