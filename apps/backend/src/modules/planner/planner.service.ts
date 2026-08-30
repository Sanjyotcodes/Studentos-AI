// Study-planner business logic: assembles deterministic inputs from the
// requesting user's own data (T13.1 — every query below is scoped by
// userId), asks ai.service.ts for a schedule, validates the response before
// trusting it (T13.4), and persists via an upsert keyed on the unique
// userId column so regenerating always replaces rather than duplicates
// (T13.7).
import type { Prisma } from '@prisma/client';
import type { StudyPlan, StudyPlanEntry } from '@studentos/shared';
import { studyPlanAiResponseSchema } from '@studentos/shared';
import { BadGatewayError, BadRequestError, NotFoundError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';
import * as aiService from '../ai/ai.service';
import * as attendanceService from '../attendance/attendance.service';
import * as timetableService from '../timetable/timetable.service';

function todayDateOnlyUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateOnlyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromDateOnly: string, toDateOnly: string): number {
  const from = new Date(`${fromDateOnly}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDateOnly}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

function toPublicStudyPlan(plan: {
  id: string;
  userId: string;
  entries: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): StudyPlan {
  return {
    id: plan.id,
    userId: plan.userId,
    // Only ever written after studyPlanAiResponseSchema validation below, so
    // this cast is safe — there is no path that writes an unvalidated shape.
    entries: plan.entries as unknown as StudyPlanEntry[],
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function getStudyPlan(userId: string): Promise<StudyPlan> {
  const plan = await prisma.studyPlan.findUnique({ where: { userId } });
  if (!plan) {
    throw new NotFoundError('No study plan yet — generate one first.', 'NO_STUDY_PLAN');
  }
  return toPublicStudyPlan(plan);
}

export interface PlannerInput {
  today: string;
  lastExamDate: string;
  planningWindowDays: number;
  subjectsWithExams: Array<{
    id: string;
    name: string;
    examDate: string;
    daysRemaining: number;
    attendanceRisk: boolean;
    // How many times a week this subject meets, per the timetable (Phase 16,
    // T16.9) — additional AI context only, same as attendanceRisk; a subject
    // with no timetable slots at all is 0, not an error.
    weeklyClassFrequency: number;
  }>;
  openTasks: Array<{ title: string; dueDate: string | null; subjectId: string | null }>;
}

// T13.2: generation is refused up front (400) when the requesting user has
// no subjects or no exam dates at all — never silently produces an empty or
// degenerate plan. T13.1: every query here filters by userId, so this can
// only ever see the requesting user's own data.
export async function buildPlannerInput(userId: string): Promise<PlannerInput> {
  const subjects = await prisma.subject.findMany({ where: { userId } });
  if (subjects.length === 0) {
    throw new BadRequestError(
      'Add at least one subject before generating a study plan.',
      undefined,
      'NO_SUBJECTS',
    );
  }

  const examDates = await prisma.examDate.findMany({ where: { userId } });
  if (examDates.length === 0) {
    throw new BadRequestError(
      'Add at least one exam date before generating a study plan.',
      undefined,
      'NO_EXAM_DATES',
    );
  }

  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
  const today = todayDateOnlyUtc();
  const examDateStrings = examDates.map((examDate) => formatDateOnlyUtc(examDate.date));
  const lastExamDate = examDateStrings.reduce((max, d) => (d > max ? d : max));

  const attendanceSummary = await attendanceService.getAttendanceSummary(userId, {});
  const weakSubjectIds = new Set(
    attendanceSummary.subjects.filter((s) => s.status === 'AT_RISK').map((s) => s.subjectId),
  );

  const openTasks = await prisma.task.findMany({
    where: { userId, status: { not: 'DONE' } },
    orderBy: { dueDate: 'asc' },
  });

  const weeklyFrequencyBySubject = await timetableService.getWeeklyFrequencyBySubject(userId);

  const subjectsWithExams = examDates.map((examDate) => {
    const examDateStr = formatDateOnlyUtc(examDate.date);
    const subject = subjectsById.get(examDate.subjectId);
    return {
      id: examDate.subjectId,
      name: subject?.name ?? 'Unknown subject',
      examDate: examDateStr,
      daysRemaining: daysBetween(today, examDateStr),
      attendanceRisk: weakSubjectIds.has(examDate.subjectId),
      weeklyClassFrequency: weeklyFrequencyBySubject.get(examDate.subjectId) ?? 0,
    };
  });

  return {
    today,
    lastExamDate,
    planningWindowDays: daysBetween(today, lastExamDate),
    subjectsWithExams,
    openTasks: openTasks.map((task) => ({
      title: task.title,
      dueDate: task.dueDate ? formatDateOnlyUtc(task.dueDate) : null,
      subjectId: task.subjectId,
    })),
  };
}

function isEntryWithinRange(entry: StudyPlanEntry, today: string, lastExamDate: string): boolean {
  return entry.date >= today && entry.date <= lastExamDate;
}

const AI_INVALID_PLAN_MESSAGE = "The AI assistant's response wasn't in the expected format. Please try again.";

export async function generateStudyPlan(userId: string): Promise<StudyPlan> {
  const input = await buildPlannerInput(userId);
  const allowedSubjectIds = input.subjectsWithExams.map((s) => s.id);

  const result = await aiService.generateStudyPlan(JSON.stringify(input, null, 2), allowedSubjectIds);

  // A refusal has no usable plan content — treat it the same as an upstream
  // failure: a graceful error, nothing persisted (T13.5).
  if (result.refused) {
    throw new BadGatewayError(
      "The AI assistant couldn't generate a plan right now. Please try again.",
      'AI_PLAN_REFUSED',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    throw new BadGatewayError(AI_INVALID_PLAN_MESSAGE, 'AI_INVALID_PLAN');
  }

  // T13.4: shape validated by Zod before anything is trusted, let alone
  // persisted — a malformed response is rejected here, never surfaced raw.
  const validation = studyPlanAiResponseSchema.safeParse(parsed);
  if (!validation.success) {
    throw new BadGatewayError(AI_INVALID_PLAN_MESSAGE, 'AI_INVALID_PLAN');
  }

  // Content-level checks the shape alone can't express: every date within
  // the requested window, every subjectId one we actually sent. A response
  // that matches the schema but hallucinates outside these bounds is
  // rejected the same way — no partial plan is ever persisted (T13.5).
  const allowedSubjectIdSet = new Set(allowedSubjectIds);
  const entries = validation.data.entries;
  const allWithinBounds = entries.every(
    (entry) =>
      allowedSubjectIdSet.has(entry.subjectId) &&
      isEntryWithinRange(entry, input.today, input.lastExamDate),
  );
  if (!allWithinBounds) {
    throw new BadGatewayError(AI_INVALID_PLAN_MESSAGE, 'AI_INVALID_PLAN');
  }

  // T13.6: "covers every subject with an exam" is a completeness guarantee,
  // not just a bounds check — a plan that silently drops one of the exam
  // subjects fails the deliverable just as much as one with an invalid
  // entry, so it's rejected the same way rather than persisted incomplete.
  const coveredSubjectIds = new Set(entries.map((entry) => entry.subjectId));
  const coversEverySubject = allowedSubjectIds.every((id) => coveredSubjectIds.has(id));
  if (!coversEverySubject) {
    throw new BadGatewayError(AI_INVALID_PLAN_MESSAGE, 'AI_INVALID_PLAN');
  }

  // Upsert keyed on the unique userId column (schema.prisma) — regenerating
  // always replaces the single existing row rather than ever inserting a
  // second one (T13.7).
  const plan = await prisma.studyPlan.upsert({
    where: { userId },
    update: { entries: entries as unknown as Prisma.InputJsonValue },
    create: { userId, entries: entries as unknown as Prisma.InputJsonValue },
  });
  return toPublicStudyPlan(plan);
}
