// Attendance business logic and data access — the ONLY place in the codebase
// that computes attendance percentage or cutoff prediction (PLAN.md §4,
// invariant 10; T6.17). Every query/mutation is scoped by userId, always
// through the owning Subject (AttendanceRecord has no direct userId column —
// see PLAN.md §9, "AttendanceRecord ownership scoping").
import type {
  AttendanceRecord,
  AttendanceSummary,
  AttendanceSummaryQuery,
  MarkAttendanceInput,
  SubjectAttendanceSummary,
  UpdateAttendanceInput,
} from '@studentos/shared';
import { NotFoundError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';

// A tiny epsilon absorbs floating-point representation error at exact cutoff
// boundaries (e.g. a cutoff of 70% is 0.7, which has no exact binary
// representation) — it never changes the result for a non-boundary case.
const EPSILON = 1e-9;

/**
 * The percentage/prediction formulas — computed exactly once, here, and
 * nowhere else in the codebase (T6.17). PLAN.md §3 defines them as:
 *   canMiss    = largest integer m >= 0 such that a / (t + m) >= c
 *   mustAttend = smallest integer k >= 0 such that (a + k) / (t + k) >= c
 * where a = attended, t = total, c = cutoff as a fraction (0..1).
 */
export function computePercentage(attended: number, total: number): number | null {
  if (total === 0) {
    return null;
  }
  return Math.round((attended / total) * 10000) / 100;
}

export function computeCanMiss(attended: number, total: number, cutoffFraction: number): number {
  if (cutoffFraction <= 0) {
    // A 0% cutoff can never be missed below — treat as unbounded.
    return Number.MAX_SAFE_INTEGER;
  }
  const raw = attended / cutoffFraction - total;
  return Math.max(0, Math.floor(raw + EPSILON));
}

export function computeMustAttend(attended: number, total: number, cutoffFraction: number): number {
  if (attended >= cutoffFraction * total - EPSILON) {
    return 0;
  }
  if (cutoffFraction >= 1) {
    // A 100% cutoff can never be reached again once a class has been missed.
    return Number.MAX_SAFE_INTEGER;
  }
  const raw = (cutoffFraction * total - attended) / (1 - cutoffFraction);
  return Math.max(0, Math.ceil(raw - EPSILON));
}

function parseDateOnlyUtc(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function formatDateOnlyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDateFilter(from?: string, to?: string): { date?: { gte?: Date; lte?: Date } } {
  if (!from && !to) {
    return {};
  }
  const date: { gte?: Date; lte?: Date } = {};
  if (from) {
    date.gte = parseDateOnlyUtc(from);
  }
  if (to) {
    // Inclusive upper bound (T6.15) — end of the given calendar day, UTC.
    const end = parseDateOnlyUtc(to);
    end.setUTCHours(23, 59, 59, 999);
    date.lte = end;
  }
  return { date };
}

function toPublicAttendanceRecord(record: {
  id: string;
  subjectId: string;
  date: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): AttendanceRecord {
  return {
    id: record.id,
    subjectId: record.subjectId,
    date: formatDateOnlyUtc(record.date),
    status: record.status as AttendanceRecord['status'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function markAttendance(
  userId: string,
  input: MarkAttendanceInput,
): Promise<AttendanceRecord> {
  const subject = await prisma.subject.findFirst({ where: { id: input.subjectId, userId } });
  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  const date = parseDateOnlyUtc(input.date);
  const record = await prisma.attendanceRecord.upsert({
    where: { subjectId_date: { subjectId: input.subjectId, date } },
    update: { status: input.status },
    create: { subjectId: input.subjectId, date, status: input.status },
  });

  return toPublicAttendanceRecord(record);
}

export async function listAttendance(
  userId: string,
  query: AttendanceSummaryQuery,
): Promise<AttendanceRecord[]> {
  const records = await prisma.attendanceRecord.findMany({
    where: {
      subject: { userId },
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...buildDateFilter(query.from, query.to),
    },
    orderBy: { date: 'asc' },
  });

  return records.map(toPublicAttendanceRecord);
}

async function findOwnedAttendanceRecordOrThrow(userId: string, recordId: string) {
  const record = await prisma.attendanceRecord.findFirst({
    where: { id: recordId, subject: { userId } },
  });
  if (!record) {
    throw new NotFoundError('Attendance record not found');
  }
  return record;
}

export async function updateAttendance(
  userId: string,
  recordId: string,
  input: UpdateAttendanceInput,
): Promise<AttendanceRecord> {
  await findOwnedAttendanceRecordOrThrow(userId, recordId);
  const updated = await prisma.attendanceRecord.update({
    where: { id: recordId },
    data: { status: input.status },
  });
  return toPublicAttendanceRecord(updated);
}

export async function deleteAttendance(userId: string, recordId: string): Promise<void> {
  await findOwnedAttendanceRecordOrThrow(userId, recordId);
  await prisma.attendanceRecord.delete({ where: { id: recordId } });
}

export async function getAttendanceSummary(
  userId: string,
  query: AttendanceSummaryQuery,
): Promise<AttendanceSummary> {
  const subjects = await prisma.subject.findMany({
    where: { userId, ...(query.subjectId ? { id: query.subjectId } : {}) },
    orderBy: { createdAt: 'asc' },
  });

  const records = await prisma.attendanceRecord.findMany({
    where: {
      subjectId: { in: subjects.map((subject) => subject.id) },
      ...buildDateFilter(query.from, query.to),
    },
  });

  const recordsBySubjectId = new Map<string, typeof records>();
  for (const record of records) {
    const bucket = recordsBySubjectId.get(record.subjectId);
    if (bucket) {
      bucket.push(record);
    } else {
      recordsBySubjectId.set(record.subjectId, [record]);
    }
  }

  const summaries: SubjectAttendanceSummary[] = [];
  let overallAttended = 0;
  let overallTotal = 0;

  for (const subject of subjects) {
    const subjectRecords = recordsBySubjectId.get(subject.id) ?? [];
    // CANCELLED and HOLIDAY records count toward neither side (T6.10, T16.10)
    // — only counting PRESENT/ABSENT explicitly means any other status is
    // excluded automatically, with no extra branching needed here.
    const attended = subjectRecords.filter((record) => record.status === 'PRESENT').length;
    const total =
      attended + subjectRecords.filter((record) => record.status === 'ABSENT').length;
    const cutoffFraction = subject.minAttendancePercent / 100;

    const percentage = computePercentage(attended, total);
    const canMiss = computeCanMiss(attended, total, cutoffFraction);
    const mustAttend = computeMustAttend(attended, total, cutoffFraction);
    const status: SubjectAttendanceSummary['status'] =
      percentage !== null && percentage < subject.minAttendancePercent ? 'AT_RISK' : 'SAFE';

    summaries.push({
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      attended,
      total,
      percentage,
      minAttendancePercent: subject.minAttendancePercent,
      status,
      canMiss,
      mustAttend,
    });

    overallAttended += attended;
    overallTotal += total;
  }

  return {
    subjects: summaries,
    overall: {
      attended: overallAttended,
      total: overallTotal,
      percentage: computePercentage(overallAttended, overallTotal),
    },
  };
}
