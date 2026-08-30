// Notes route definitions.
import { createNoteSchema, noteFilterQuerySchema, updateNoteSchema } from '@studentos/shared';
import { Router } from 'express';
import { idParamSchema } from '../../lib/idParamSchema';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as notesController from './notes.controller';

export const notesRouter = Router();

// Every notes route requires authentication.
notesRouter.use(requireAuth);

notesRouter.get('/', validate(noteFilterQuerySchema, 'query'), notesController.list);
notesRouter.post('/', validate(createNoteSchema), notesController.create);
notesRouter.get('/:id', validate(idParamSchema, 'params'), notesController.getOne);
notesRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateNoteSchema),
  notesController.update,
);
notesRouter.delete('/:id', validate(idParamSchema, 'params'), notesController.remove);
