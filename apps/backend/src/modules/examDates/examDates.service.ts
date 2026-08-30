// Exam-dates business logic and data access. Every query/mutation is scoped
// by userId (PLAN.md §4, invariant 11) — a user can only ever see or touch
// their own exam dates, and can only ever link one to a subject they own.
import type { ExamDate, UpsertExamDateInput } from '@studentos/shared';
import { NotFoundError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';

function parseDateOnlyUtc(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function formatDateOnlyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toPublicExamDate(examDate: {
  id: string;
  userId: string;
  subjectId: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}): ExamDate {
  return {
    id: examDate.id,
    userId: examDate.userId,
    subjectId: examDate.subjectId,
    date: formatDateOnlyUtc(examDate.date),
    createdAt: examDate.createdAt.toISOString(),
    updatedAt: examDate.updatedAt.toISOString(),
  };
}

async function assertSubjectOwnedByUser(userId: string, subjectId: string): Promise<void> {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError('Subject not found');
  }
}

export async function listExamDates(userId: string): Promise<ExamDate[]> {
  const examDates = await prisma.examDate.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });
  return examDates.map(toPublicExamDate);
}

// At most one exam date per subject (schema.prisma's @@unique([subjectId])) —
// setting a new date for a subject that already has one updates it in place,
// so the "exam-date input" UI is just "set the date," not "create vs. edit."
export async function upsertExamDate(userId: string, input: UpsertExamDateInput): Promise<ExamDate> {
  await assertSubjectOwnedByUser(userId, input.subjectId);

  const date = parseDateOnlyUtc(input.date);
  const examDate = await prisma.examDate.upsert({
    where: { subjectId: input.subjectId },
    update: { date },
    create: { userId, subjectId: input.subjectId, date },
  });
  return toPublicExamDate(examDate);
}

export async function deleteExamDate(userId: string, examDateId: string): Promise<void> {
  const examDate = await prisma.examDate.findFirst({ where: { id: examDateId, userId } });
  if (!examDate) {
    throw new NotFoundError('Exam date not found');
  }
  await prisma.examDate.delete({ where: { id: examDateId } });
}
