// Grades route definitions.
import { createMarkSchema, markFilterQuerySchema, updateMarkSchema } from '@studentos/shared';
import { Router } from 'express';
import { idParamSchema } from '../../lib/idParamSchema';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as gradesController from './grades.controller';

export const gradesRouter = Router();

// Every grades route requires authentication.
gradesRouter.use(requireAuth);

// Registered before "/" so it's never shadowed by a future GET "/:id"
// (same ordering rationale as attendance.routes.ts).
gradesRouter.get('/summary', gradesController.summary);
gradesRouter.get('/', validate(markFilterQuerySchema, 'query'), gradesController.list);
gradesRouter.post('/', validate(createMarkSchema), gradesController.create);
gradesRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateMarkSchema),
  gradesController.update,
);
gradesRouter.delete('/:id', validate(idParamSchema, 'params'), gradesController.remove);
