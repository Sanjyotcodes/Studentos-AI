// Tasks request handlers — parse (already done by validate.middleware) →
// delegate to the service → shape the response.
import type { TaskFilterQuery } from '@studentos/shared';
import { catchAsync } from '../../lib/catchAsync';
import * as tasksService from './tasks.service';

export const list = catchAsync(async (req, res) => {
  const query = req.query as unknown as TaskFilterQuery;
  const tasks = await tasksService.listTasks(req.user!.id, query);
  res.status(200).json({ success: true, data: tasks });
});

export const create = catchAsync(async (req, res) => {
  const task = await tasksService.createTask(req.user!.id, req.body);
  res.status(201).json({ success: true, data: task });
});

// Completion toggle (T11.6) is not a separate endpoint — the frontend PATCHes
// `status` to an explicit target value (TODO <-> DONE), which is idempotent
// by construction: setting the same status twice yields the same result with
// no duplicated side effect, unlike a server-side "flip current status" would be.
export const update = catchAsync(async (req, res) => {
  const task = await tasksService.updateTask(req.user!.id, req.params.id!, req.body);
  res.status(200).json({ success: true, data: task });
});

export const remove = catchAsync(async (req, res) => {
  await tasksService.deleteTask(req.user!.id, req.params.id!);
  res.status(204).send();
});
