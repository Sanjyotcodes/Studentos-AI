// Exam-dates route definitions.
import { upsertExamDateSchema } from '@studentos/shared';
import { Router } from 'express';
import { idParamSchema } from '../../lib/idParamSchema';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as examDatesController from './examDates.controller';

export const examDatesRouter = Router();

// Every exam-dates route requires authentication.
examDatesRouter.use(requireAuth);

examDatesRouter.get('/', examDatesController.list);
// POST upserts by subjectId (at most one exam date per subject) — 200, not
// 201, since it may update rather than create.
examDatesRouter.post('/', validate(upsertExamDateSchema), examDatesController.upsert);
examDatesRouter.delete('/:id', validate(idParamSchema, 'params'), examDatesController.remove);
