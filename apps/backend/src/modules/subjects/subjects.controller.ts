// Subjects request handlers. Parse (already done by validate.middleware) →
// delegate → shape response.
import { catchAsync } from '../../lib/catchAsync';
import * as subjectsService from './subjects.service';

export const list = catchAsync(async (req, res) => {
  const subjects = await subjectsService.listSubjects(req.user!.id);
  res.status(200).json({ success: true, data: subjects });
});

export const create = catchAsync(async (req, res) => {
  const subject = await subjectsService.createSubject(req.user!.id, req.body);
  res.status(201).json({ success: true, data: subject });
});

export const update = catchAsync(async (req, res) => {
  const subject = await subjectsService.updateSubject(req.user!.id, req.params.id!, req.body);
  res.status(200).json({ success: true, data: subject });
});

export const remove = catchAsync(async (req, res) => {
  await subjectsService.deleteSubject(req.user!.id, req.params.id!);
  res.status(204).send();
});
