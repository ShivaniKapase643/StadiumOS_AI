import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/apiResponse';
import { generateInsights } from './insights.service';
import { answerChatbotQuery } from './chatbot.service';

const router = Router();
router.use(requireAuth);

const chatbotSchema = z.object({ body: z.object({ message: z.string().min(1).max(500) }) });

/**
 * @openapi
 * /ai/insights:
 *   get:
 *     summary: Rule-based operational recommendations from current live conditions
 *     tags: [AI]
 */
router.get(
  '/insights',
  asyncHandler(async (_req, res) => {
    ok(res, await generateInsights());
  })
);

/**
 * @openapi
 * /ai/chatbot:
 *   post:
 *     summary: Ask the fan-facing FAQ chatbot a question
 *     tags: [AI]
 */
router.post(
  '/chatbot',
  validate(chatbotSchema),
  asyncHandler(async (req, res) => {
    const reply = await answerChatbotQuery(req.body.message);
    ok(res, { reply });
  })
);

export default router;
