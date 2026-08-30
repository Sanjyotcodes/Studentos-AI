// Attendance request handlers — parse (already done by validate.middleware) →
// delegate to the service → shape the response.
import type { AttendanceSummaryQuery } from '@studentos/shared';
import { catchAsync } from '../../lib/catchAsync';
import * as attendanceService from './attendance.service';

export const list = catchAsync(async (req, res) => {
  const query = req.query as unknown as AttendanceSummaryQuery;
  const records = await attendanceService.listAttendance(req.user!.id, query);
  res.status(200).json({ success: true, data: records });
});

export const mark = catchAsync(async (req, res) => {
  // Idempotent upsert, not a pure create — 200 rather than 201, since a
  // second call for the same subject+date updates the existing record.
  const record = await attendanceService.markAttendance(req.user!.id, req.body);
  res.status(200).json({ success: true, data: record });
});

export const summary = catchAsync(async (req, res) => {
  const query = req.query as unknown as AttendanceSummaryQuery;
  const result = await attendanceService.getAttendanceSummary(req.user!.id, query);
  res.status(200).json({ success: true, data: result });
});

export const update = catchAsync(async (req, res) => {
  const record = await attendanceService.updateAttendance(req.user!.id, req.params.id!, req.body);
  res.status(200).json({ success: true, data: record });
});

export const remove = catchAsync(async (req, res) => {
  await attendanceService.deleteAttendance(req.user!.id, req.params.id!);
  res.status(204).send();
});
