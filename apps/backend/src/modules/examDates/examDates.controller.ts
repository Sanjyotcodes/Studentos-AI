// Exam-dates request handlers — parse (already done by validate.middleware) →
// delegate to the service → shape the response.
import { catchAsync } from '../../lib/catchAsync';
import * as examDatesService from './examDates.service';

export const list = catchAsync(async (req, res) => {
  const examDates = await examDatesService.listExamDates(req.user!.id);
  res.status(200).json({ success: true, data: examDates });
});

export const upsert = catchAsync(async (req, res) => {
  const examDate = await examDatesService.upsertExamDate(req.user!.id, req.body);
  res.status(200).json({ success: true, data: examDate });
});

export const remove = catchAsync(async (req, res) => {
  await examDatesService.deleteExamDate(req.user!.id, req.params.id!);
  res.status(204).send();
});
