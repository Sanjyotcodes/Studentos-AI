// Subjects route definitions.
import { createSubjectSchema, updateSubjectSchema } from '@studentos/shared';
import { Router } from 'express';
import { idParamSchema } from '../../lib/idParamSchema';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as subjectsController from './subjects.controller';

export const subjectsRouter = Router();

// Every subjects route requires authentication (T6.18).
subjectsRouter.use(requireAuth);

subjectsRouter.get('/', subjectsController.list);
subjectsRouter.post('/', validate(createSubjectSchema), subjectsController.create);
subjectsRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateSubjectSchema),
  subjectsController.update,
);
subjectsRouter.delete('/:id', validate(idParamSchema, 'params'), subjectsController.remove);
