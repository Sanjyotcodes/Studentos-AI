// Tasks business logic and data access. Every query/mutation is scoped by
// userId (PLAN.md §4, invariant 11) — a user can only ever see or touch
// their own tasks, and can only ever link a task to a subject they own.
import type { CreateTaskInput, Task, TaskFilterQuery, UpdateTaskInput } from '@studentos/shared';
import { NotFoundError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';

function parseDateOnlyUtc(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function formatDateOnlyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toPublicTask(task: {
  id: string;
  userId: string;
  subjectId: string | null;
  title: string;
  notes: string | null;
  dueDate: Date | null;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Task {
  return {
    id: task.id,
    userId: task.userId,
    subjectId: task.subjectId,
    title: task.title,
    notes: task.notes,
    dueDate: task.dueDate ? formatDateOnlyUtc(task.dueDate) : null,
    priority: task.priority as Task['priority'],
    status: task.status as Task['status'],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

async function assertSubjectOwnedByUser(userId: string, subjectId: string): Promise<void> {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError('Subject not found');
  }
}

function buildDueDateFilter(from?: string, to?: string): { dueDate?: { gte?: Date; lte?: Date } } {
  if (!from && !to) {
    return {};
  }
  const dueDate: { gte?: Date; lte?: Date } = {};
  if (from) {
    dueDate.gte = parseDateOnlyUtc(from);
  }
  if (to) {
    // Inclusive upper bound (matches attendance's date-range convention).
    const end = parseDateOnlyUtc(to);
    end.setUTCHours(23, 59, 59, 999);
    dueDate.lte = end;
  }
  return { dueDate };
}

export async function listTasks(userId: string, query: TaskFilterQuery): Promise<Task[]> {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...buildDueDateFilter(query.from, query.to),
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });
  return tasks.map(toPublicTask);
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  if (input.subjectId) {
    await assertSubjectOwnedByUser(userId, input.subjectId);
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title: input.title,
      notes: input.notes,
      dueDate: input.dueDate ? parseDateOnlyUtc(input.dueDate) : undefined,
      priority: input.priority,
      status: input.status,
      subjectId: input.subjectId,
    },
  });
  return toPublicTask(task);
}

async function findOwnedTaskOrThrow(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!task) {
    throw new NotFoundError('Task not found');
  }
  return task;
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  await findOwnedTaskOrThrow(userId, taskId);

  if (input.subjectId) {
    await assertSubjectOwnedByUser(userId, input.subjectId);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? parseDateOnlyUtc(input.dueDate) : null }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
    },
  });
  return toPublicTask(updated);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  await findOwnedTaskOrThrow(userId, taskId);
  await prisma.task.delete({ where: { id: taskId } });
}
