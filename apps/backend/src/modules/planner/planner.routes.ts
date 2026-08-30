// Study-planner route definitions.
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimit.middleware';
import * as plannerController from './planner.controller';

export const plannerRouter = Router();

// Every planner route requires authentication.
plannerRouter.use(requireAuth);

plannerRouter.get('/', plannerController.getPlan);

// Generation calls the AI (real marginal cost per request, same rationale as
// the ai.* routes in PLAN.md §3.4) — rate-limited per user, not per IP.
plannerRouter.post(
  '/generate',
  createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => req.user!.id,
  }),
  plannerController.generatePlan,
);
