// Timetable request handlers — parse (already done by validate.middleware) →
// delegate to the service → shape the response.
import type { TimetableSlotFilterQuery, TimetableTodayQuery } from '@studentos/shared';
import { BadRequestError } from '../../errors/AppError';
import { catchAsync } from '../../lib/catchAsync';
import * as timetableService from './timetable.service';

export const list = catchAsync(async (req, res) => {
  const query = req.query as unknown as TimetableSlotFilterQuery;
  const slots = await timetableService.listTimetableSlots(req.user!.id, query);
  res.status(200).json({ success: true, data: slots });
});

export const create = catchAsync(async (req, res) => {
  const slot = await timetableService.createTimetableSlot(req.user!.id, req.body);
  res.status(201).json({ success: true, data: slot });
});

export const update = catchAsync(async (req, res) => {
  const slot = await timetableService.updateTimetableSlot(req.user!.id, req.params.id!, req.body);
  res.status(200).json({ success: true, data: slot });
});

export const remove = catchAsync(async (req, res) => {
  await timetableService.deleteTimetableSlot(req.user!.id, req.params.id!);
  res.status(204).send();
});

// T16.6: today's scheduled subjects, for attendance's quick-mark defaults.
export const today = catchAsync(async (req, res) => {
  const query = req.query as unknown as TimetableTodayQuery;
  const dateOnly = query.date ?? new Date().toISOString().slice(0, 10);
  const dayOfWeek = timetableService.dayOfWeekForDate(dateOnly);
  const subjectIds = await timetableService.getSubjectIdsScheduledOn(req.user!.id, dayOfWeek);
  res.status(200).json({ success: true, data: { dayOfWeek, subjectIds } });
});

// T16.4/T16.5: req.file is populated by upload.middleware.ts's multer
// instance, which already ran by the time this handler executes. Never
// persists anything itself — only returns proposed slots for review.
export const parseUpload = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new BadRequestError('No file was uploaded.', undefined, 'FILE_REQUIRED');
  }
  const result = await timetableService.parseTimetableUpload(
    req.user!.id,
    req.file.buffer,
    req.file.mimetype,
  );
  res.status(200).json({ success: true, data: result });
});
