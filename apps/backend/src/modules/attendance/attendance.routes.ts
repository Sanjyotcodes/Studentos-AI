// Attendance route definitions.
import {
  attendanceSummaryQuerySchema,
  markAttendanceSchema,
  updateAttendanceSchema,
} from '@studentos/shared';
import { Router } from 'express';
import { idParamSchema } from '../../lib/idParamSchema';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as attendanceController from './attendance.controller';

export const attendanceRouter = Router();

// Every attendance route requires authentication (T6.18).
attendanceRouter.use(requireAuth);

// Registered before "/" so it's never shadowed by a future GET "/:id".
attendanceRouter.get(
  '/summary',
  validate(attendanceSummaryQuerySchema, 'query'),
  attendanceController.summary,
);
attendanceRouter.get(
  '/',
  validate(attendanceSummaryQuerySchema, 'query'),
  attendanceController.list,
);
attendanceRouter.post('/', validate(markAttendanceSchema), attendanceController.mark);
attendanceRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateAttendanceSchema),
  attendanceController.update,
);
attendanceRouter.delete('/:id', validate(idParamSchema, 'params'), attendanceController.remove);
