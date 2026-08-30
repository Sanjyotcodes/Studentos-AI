// Grades business logic and data access — the ONLY place in the codebase
// that computes weighted subject percentages, grade points, or GPA
// (PLAN.md §4, invariant 10; mirrors attendance.service.ts's
// computePercentage/computeCanMiss/computeMustAttend precedent exactly).
// Every query/mutation is scoped by userId (invariant 11).
import type {
  CreateMarkInput,
  GradesSummary,
  Mark,
  MarkFilterQuery,
  SubjectGradeSummary,
  UpdateMarkInput,
} from '@studentos/shared';
import { DEFAULT_GRADING_SCHEME, type GradeBand } from '@studentos/shared';
import { BadRequestError, NotFoundError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';

// Rounding is applied in exactly this one function (T14.6) — every
// percentage or GPA figure this module returns passes through here once, at
// the point it's finalized, never during intermediate aggregation (rounding
// mid-calculation would compound error across marks/subjects).
export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Weighted subject percentage: Σ(scored_i/max_i × weight_i) / Σ(weight_i) × 100.
 * Weights are treated as relative to each other, not required to literally
 * sum to 100 — dividing by their own sum normalizes them regardless (T14.5).
 * Returns null (never NaN) when the subject has no marks yet (T14.4), the
 * same nullability convention as SubjectAttendanceSummary.percentage.
 */
export function computeWeightedPercentage(
  marks: Array<{ scored: number; max: number; weight: number }>,
): number | null {
  const totalWeight = marks.reduce((sum, m) => sum + m.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }
  const weightedSum = marks.reduce((sum, m) => sum + (m.scored / m.max) * m.weight, 0);
  return roundTo2((weightedSum / totalWeight) * 100);
}

/**
 * Maps a percentage to a grade point via the given scheme (default: the
 * 10-point scale in DEFAULT_GRADING_SCHEME) — the scheme is a plain,
 * swappable data table, not inline if/else, so a future institution-specific
 * scheme is a different table passed in here, not new branching logic.
 */
export function percentageToGradePoint(
  percentage: number,
  scheme: readonly GradeBand[] = DEFAULT_GRADING_SCHEME,
): number {
  const sorted = [...scheme].sort((a, b) => b.minPercent - a.minPercent);
  for (const band of sorted) {
    if (percentage >= band.minPercent) {
      return band.gradePoint;
    }
  }
  // Unreachable given a scheme with a 0-floor band, but keeps this function
  // total rather than possibly-undefined.
  return 0;
}

/** Unweighted mean of subjects' grade points. 0 (never NaN) with no subjects to average (T14.4). */
export function computeGpa(subjectGradePoints: number[]): number {
  if (subjectGradePoints.length === 0) {
    return 0;
  }
  const sum = subjectGradePoints.reduce((total, gradePoint) => total + gradePoint, 0);
  return roundTo2(sum / subjectGradePoints.length);
}

function toPublicMark(mark: {
  id: string;
  userId: string;
  subjectId: string;
  assessmentType: string;
  label: string | null;
  scored: number;
  max: number;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}): Mark {
  return {
    id: mark.id,
    userId: mark.userId,
    subjectId: mark.subjectId,
    assessmentType: mark.assessmentType as Mark['assessmentType'],
    label: mark.label,
    scored: mark.scored,
    max: mark.max,
    weight: mark.weight,
    createdAt: mark.createdAt.toISOString(),
    updatedAt: mark.updatedAt.toISOString(),
  };
}

async function assertSubjectOwnedByUser(userId: string, subjectId: string): Promise<void> {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError('Subject not found');
  }
}

function assertScoredWithinMax(scored: number, max: number): void {
  if (scored > max) {
    throw new BadRequestError('Scored cannot exceed max', undefined, 'SCORED_EXCEEDS_MAX');
  }
}

export async function listMarks(userId: string, query: MarkFilterQuery): Promise<Mark[]> {
  const marks = await prisma.mark.findMany({
    where: {
      userId,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
  return marks.map(toPublicMark);
}

export async function createMark(userId: string, input: CreateMarkInput): Promise<Mark> {
  await assertSubjectOwnedByUser(userId, input.subjectId);
  assertScoredWithinMax(input.scored, input.max);

  const mark = await prisma.mark.create({
    data: {
      userId,
      subjectId: input.subjectId,
      assessmentType: input.assessmentType,
      label: input.label,
      scored: input.scored,
      max: input.max,
      weight: input.weight,
    },
  });
  return toPublicMark(mark);
}

async function findOwnedMarkRowOrThrow(userId: string, markId: string) {
  const mark = await prisma.mark.findFirst({ where: { id: markId, userId } });
  if (!mark) {
    throw new NotFoundError('Mark not found');
  }
  return mark;
}

export async function updateMark(userId: string, markId: string, input: UpdateMarkInput): Promise<Mark> {
  const existing = await findOwnedMarkRowOrThrow(userId, markId);

  // A partial update (e.g. only `scored`) is checked against the merged
  // result, not just the fields present in this payload — the only way to
  // know whether "scored > max" holds is to resolve both against the
  // existing stored values first (T14.2).
  const mergedScored = input.scored ?? existing.scored;
  const mergedMax = input.max ?? existing.max;
  assertScoredWithinMax(mergedScored, mergedMax);

  const updated = await prisma.mark.update({
    where: { id: markId },
    data: {
      ...(input.assessmentType !== undefined ? { assessmentType: input.assessmentType } : {}),
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.scored !== undefined ? { scored: input.scored } : {}),
      ...(input.max !== undefined ? { max: input.max } : {}),
      ...(input.weight !== undefined ? { weight: input.weight } : {}),
    },
  });
  return toPublicMark(updated);
}

export async function deleteMark(userId: string, markId: string): Promise<void> {
  await findOwnedMarkRowOrThrow(userId, markId);
  await prisma.mark.delete({ where: { id: markId } });
}

export async function getGradesSummary(userId: string): Promise<GradesSummary> {
  const subjects = await prisma.subject.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  const marks = await prisma.mark.findMany({ where: { userId } });

  const marksBySubjectId = new Map<string, typeof marks>();
  for (const mark of marks) {
    const bucket = marksBySubjectId.get(mark.subjectId);
    if (bucket) {
      bucket.push(mark);
    } else {
      marksBySubjectId.set(mark.subjectId, [mark]);
    }
  }

  const subjectSummaries: SubjectGradeSummary[] = [];
  const gradePointsForGpa: number[] = [];

  for (const subject of subjects) {
    const subjectMarks = marksBySubjectId.get(subject.id) ?? [];
    const totalWeightRecorded = subjectMarks.reduce((sum, m) => sum + m.weight, 0);
    const weightedPercentage = computeWeightedPercentage(subjectMarks);
    const gradePoint = weightedPercentage !== null ? percentageToGradePoint(weightedPercentage) : null;
    if (gradePoint !== null) {
      gradePointsForGpa.push(gradePoint);
    }

    subjectSummaries.push({
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      totalWeightRecorded: roundTo2(totalWeightRecorded),
      weightedPercentage,
      gradePoint,
    });
  }

  return {
    subjects: subjectSummaries,
    gpa: computeGpa(gradePointsForGpa),
  };
}
