// Grades request handlers — parse (already done by validate.middleware) →
// delegate to the service → shape the response.
import type { MarkFilterQuery } from '@studentos/shared';
import { catchAsync } from '../../lib/catchAsync';
import * as gradesService from './grades.service';

export const list = catchAsync(async (req, res) => {
  const query = req.query as unknown as MarkFilterQuery;
  const marks = await gradesService.listMarks(req.user!.id, query);
  res.status(200).json({ success: true, data: marks });
});

export const create = catchAsync(async (req, res) => {
  const mark = await gradesService.createMark(req.user!.id, req.body);
  res.status(201).json({ success: true, data: mark });
});

export const update = catchAsync(async (req, res) => {
  const mark = await gradesService.updateMark(req.user!.id, req.params.id!, req.body);
  res.status(200).json({ success: true, data: mark });
});

export const remove = catchAsync(async (req, res) => {
  await gradesService.deleteMark(req.user!.id, req.params.id!);
  res.status(204).send();
});

export const summary = catchAsync(async (req, res) => {
  const result = await gradesService.getGradesSummary(req.user!.id);
  res.status(200).json({ success: true, data: result });
});
