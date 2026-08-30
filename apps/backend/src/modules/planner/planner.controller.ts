// Planner request handlers — delegate to the service → shape the response.
import { catchAsync } from '../../lib/catchAsync';
import * as plannerService from './planner.service';

export const getPlan = catchAsync(async (req, res) => {
  const plan = await plannerService.getStudyPlan(req.user!.id);
  res.status(200).json({ success: true, data: plan });
});

// One endpoint for both "generate" and "regenerate" — the service's upsert
// means calling this twice replaces the plan rather than duplicating it
// (T13.7), so there's no separate "regenerate" route to keep in sync.
export const generatePlan = catchAsync(async (req, res) => {
  const plan = await plannerService.generateStudyPlan(req.user!.id);
  res.status(200).json({ success: true, data: plan });
});
