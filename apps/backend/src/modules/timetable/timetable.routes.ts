// Timetable route definitions.
import {
  createTimetableSlotSchema,
  timetableSlotFilterQuerySchema,
  timetableTodayQuerySchema,
  updateTimetableSlotSchema,
} from '@studentos/shared';
import { Router } from 'express';
import { idParamSchema } from '../../lib/idParamSchema';
import { requireAuth } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimit.middleware';
import { uploadTimetableImage } from '../../middleware/upload.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as timetableController from './timetable.controller';

export const timetableRouter = Router();

// Every timetable route requires authentication.
timetableRouter.use(requireAuth);

// Calls the AI (real marginal cost per request, same rationale as the ai.*
// and planner.* routes) — rate-limited per user, not per IP. Registered
// before "/" for the same ordering reason as "/today" below.
timetableRouter.post(
  '/parse',
  createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => req.user!.id,
  }),
  uploadTimetableImage,
  timetableController.parseUpload,
);

// Registered before "/" so it's never shadowed by a future GET "/:id"
// (same ordering rationale as attendance.routes.ts's "/summary").
timetableRouter.get('/today', validate(timetableTodayQuerySchema, 'query'), timetableController.today);
timetableRouter.get('/', validate(timetableSlotFilterQuerySchema, 'query'), timetableController.list);
timetableRouter.post('/', validate(createTimetableSlotSchema), timetableController.create);
timetableRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateTimetableSlotSchema),
  timetableController.update,
);
timetableRouter.delete('/:id', validate(idParamSchema, 'params'), timetableController.remove);
