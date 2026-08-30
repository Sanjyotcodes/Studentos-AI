// AI route definitions (natural-language queries, generated summaries).
import { aiQuerySchema, summarizeNoteSchema } from '@studentos/shared';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimit.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as aiController from './ai.controller';

export const aiRouter = Router();

// Every AI route requires authentication (T10.4).
aiRouter.use(requireAuth);

// Stricter than the global limiter, and per-user rather than per-IP —
// Anthropic calls carry real marginal cost per request (PLAN.md §3.4, T10.9).
aiRouter.use(
  createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => req.user!.id,
  }),
);

aiRouter.post('/query', validate(aiQuerySchema), aiController.query);
aiRouter.get('/summary', aiController.summary);
aiRouter.post('/summarize-note', validate(summarizeNoteSchema), aiController.summarizeNote);
