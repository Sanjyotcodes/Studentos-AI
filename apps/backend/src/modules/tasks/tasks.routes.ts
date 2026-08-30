// Tasks route definitions.
import { createTaskSchema, taskFilterQuerySchema, updateTaskSchema } from '@studentos/shared';
import { Router } from 'express';
import { idParamSchema } from '../../lib/idParamSchema';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as tasksController from './tasks.controller';

export const tasksRouter = Router();

// Every tasks route requires authentication.
tasksRouter.use(requireAuth);

tasksRouter.get('/', validate(taskFilterQuerySchema, 'query'), tasksController.list);
tasksRouter.post('/', validate(createTaskSchema), tasksController.create);
tasksRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateTaskSchema),
  tasksController.update,
);
tasksRouter.delete('/:id', validate(idParamSchema, 'params'), tasksController.remove);
