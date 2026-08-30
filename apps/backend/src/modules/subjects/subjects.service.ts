// Subjects business logic and data access. Every query/mutation is scoped by
// userId (PLAN.md §4, invariant 11) — a user can only ever see or touch their
// own subjects.
import type { CreateSubjectInput, Subject, UpdateSubjectInput } from '@studentos/shared';
import { ConflictError, NotFoundError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';

function toPublicSubject(subject: {
  id: string;
  userId: string;
  name: string;
  code: string;
  totalClassesRequired: number | null;
  minAttendancePercent: number;
  createdAt: Date;
  updatedAt: Date;
}): Subject {
  return {
    id: subject.id,
    userId: subject.userId,
    name: subject.name,
    code: subject.code,
    totalClassesRequired: subject.totalClassesRequired,
    minAttendancePercent: subject.minAttendancePercent,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
  };
}

export async function listSubjects(userId: string): Promise<Subject[]> {
  const subjects = await prisma.subject.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return subjects.map(toPublicSubject);
}

export async function createSubject(userId: string, input: CreateSubjectInput): Promise<Subject> {
  const existing = await prisma.subject.findUnique({
    where: { userId_code: { userId, code: input.code } },
  });
  if (existing) {
    throw new ConflictError(
      'You already have a subject with this code',
      undefined,
      'SUBJECT_CODE_IN_USE',
    );
  }

  const subject = await prisma.subject.create({ data: { userId, ...input } });
  return toPublicSubject(subject);
}

async function findOwnedSubjectOrThrow(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError('Subject not found');
  }
  return subject;
}

export async function updateSubject(
  userId: string,
  subjectId: string,
  input: UpdateSubjectInput,
): Promise<Subject> {
  await findOwnedSubjectOrThrow(userId, subjectId);

  if (input.code) {
    const codeOwner = await prisma.subject.findUnique({
      where: { userId_code: { userId, code: input.code } },
    });
    if (codeOwner && codeOwner.id !== subjectId) {
      throw new ConflictError(
        'You already have a subject with this code',
        undefined,
        'SUBJECT_CODE_IN_USE',
      );
    }
  }

  const updated = await prisma.subject.update({ where: { id: subjectId }, data: input });
  return toPublicSubject(updated);
}

export async function deleteSubject(userId: string, subjectId: string): Promise<void> {
  await findOwnedSubjectOrThrow(userId, subjectId);
  // Cascades to AttendanceRecord (onDelete: Cascade); Task/Note keep the row
  // with subjectId set to null (onDelete: SetNull) — see prisma/schema.prisma.
  await prisma.subject.delete({ where: { id: subjectId } });
}
