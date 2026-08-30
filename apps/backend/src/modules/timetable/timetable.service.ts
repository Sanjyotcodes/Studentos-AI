// Timetable business logic and data access. Every query/mutation is scoped
// by userId (PLAN.md §4, invariant 11) — a user can only ever see or touch
// their own timetable slots, and can only ever link a slot to a subject
// they own (Phase 16).
import type {
  CreateTimetableSlotInput,
  DayOfWeek,
  ProposedTimetableSlotResult,
  TimetableParseResult,
  TimetableSlot,
  TimetableSlotFilterQuery,
  UpdateTimetableSlotInput,
} from '@studentos/shared';
import { timetableAiResponseSchema } from '@studentos/shared';
import { BadGatewayError, BadRequestError, ConflictError, NotFoundError } from '../../errors/AppError';
import { prisma } from '../../lib/prisma';
import * as aiService from '../ai/ai.service';

function toPublicSlot(slot: {
  id: string;
  userId: string;
  subjectId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
}): TimetableSlot {
  return {
    id: slot.id,
    userId: slot.userId,
    subjectId: slot.subjectId,
    dayOfWeek: slot.dayOfWeek as DayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    createdAt: slot.createdAt.toISOString(),
    updatedAt: slot.updatedAt.toISOString(),
  };
}

async function assertSubjectOwnedByUser(userId: string, subjectId: string): Promise<void> {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) {
    throw new NotFoundError('Subject not found');
  }
}

// "HH:mm" strings compare lexicographically the same as chronologically, so
// no time-parsing is needed for either the range check or the overlap test.
function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

async function assertNoOverlap(
  userId: string,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  excludeSlotId?: string,
): Promise<void> {
  const sameDaySlots = await prisma.timetableSlot.findMany({
    where: {
      userId,
      dayOfWeek,
      ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
    },
  });
  const overlapping = sameDaySlots.some((slot) =>
    timesOverlap(startTime, endTime, slot.startTime, slot.endTime),
  );
  if (overlapping) {
    throw new ConflictError(
      'This slot overlaps an existing timetable slot',
      undefined,
      'TIMETABLE_SLOT_OVERLAP',
    );
  }
}

export async function listTimetableSlots(
  userId: string,
  query: TimetableSlotFilterQuery,
): Promise<TimetableSlot[]> {
  const slots = await prisma.timetableSlot.findMany({
    where: {
      userId,
      ...(query.dayOfWeek ? { dayOfWeek: query.dayOfWeek } : {}),
    },
    // Postgres orders an enum column by its declared value order, which is
    // MON..SUN (see schema.prisma) — this sorts a week naturally with no
    // extra mapping needed.
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  return slots.map(toPublicSlot);
}

export async function createTimetableSlot(
  userId: string,
  input: CreateTimetableSlotInput,
): Promise<TimetableSlot> {
  await assertSubjectOwnedByUser(userId, input.subjectId);
  await assertNoOverlap(userId, input.dayOfWeek, input.startTime, input.endTime);

  const slot = await prisma.timetableSlot.create({
    data: {
      userId,
      subjectId: input.subjectId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });
  return toPublicSlot(slot);
}

async function findOwnedSlotRowOrThrow(userId: string, slotId: string) {
  const slot = await prisma.timetableSlot.findFirst({ where: { id: slotId, userId } });
  if (!slot) {
    throw new NotFoundError('Timetable slot not found');
  }
  return slot;
}

export async function updateTimetableSlot(
  userId: string,
  slotId: string,
  input: UpdateTimetableSlotInput,
): Promise<TimetableSlot> {
  const existing = await findOwnedSlotRowOrThrow(userId, slotId);

  if (input.subjectId) {
    await assertSubjectOwnedByUser(userId, input.subjectId);
  }

  // A partial update is checked against the merged result, not just the
  // fields present in this payload — same reasoning as grades.service.ts's
  // scored<=max check (T14.2): only the merged state can be validated.
  const mergedDay = input.dayOfWeek ?? existing.dayOfWeek;
  const mergedStart = input.startTime ?? existing.startTime;
  const mergedEnd = input.endTime ?? existing.endTime;

  if (mergedStart >= mergedEnd) {
    throw new BadRequestError('End time must be after start time', undefined, 'INVALID_TIME_RANGE');
  }
  await assertNoOverlap(userId, mergedDay, mergedStart, mergedEnd, slotId);

  const updated = await prisma.timetableSlot.update({
    where: { id: slotId },
    data: {
      ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
      ...(input.dayOfWeek !== undefined ? { dayOfWeek: input.dayOfWeek } : {}),
      ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
    },
  });
  return toPublicSlot(updated);
}

export async function deleteTimetableSlot(userId: string, slotId: string): Promise<void> {
  await findOwnedSlotRowOrThrow(userId, slotId);
  await prisma.timetableSlot.delete({ where: { id: slotId } });
}

const JS_DAY_TO_DAY_OF_WEEK: Record<number, DayOfWeek> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
};

export function dayOfWeekForDate(dateOnly: string): DayOfWeek {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  return JS_DAY_TO_DAY_OF_WEEK[date.getUTCDay()]!;
}

// Attendance integration (T16.6): which subjects are scheduled on a given
// day, so "mark today" can default to them instead of a generic picker.
export async function getSubjectIdsScheduledOn(userId: string, dayOfWeek: DayOfWeek): Promise<string[]> {
  const slots = await prisma.timetableSlot.findMany({
    where: { userId, dayOfWeek },
    select: { subjectId: true },
    distinct: ['subjectId'],
  });
  return slots.map((slot) => slot.subjectId);
}

// Planner integration (T16.9): how many times a week each subject meets, per
// the timetable — passed into planner.service.ts's deterministic input
// builder as additional AI context, never used to decide anything by itself.
export async function getWeeklyFrequencyBySubject(userId: string): Promise<Map<string, number>> {
  const slots = await prisma.timetableSlot.findMany({
    where: { userId },
    select: { subjectId: true },
  });
  const frequency = new Map<string, number>();
  for (const slot of slots) {
    frequency.set(slot.subjectId, (frequency.get(slot.subjectId) ?? 0) + 1);
  }
  return frequency;
}

const AI_INVALID_TIMETABLE_MESSAGE =
  "The AI assistant's response wasn't in the expected format. Please try again or enter your timetable manually.";

// Case-insensitive best-effort match against the student's real subjects —
// exact name/code match first, then a substring match either direction.
// Returns null (never a guess presented as certain) when nothing matches
// confidently; the reviewer picks manually in that case.
function matchSubjectByName(
  subjectName: string,
  subjects: Array<{ id: string; name: string; code: string }>,
): string | null {
  const normalized = subjectName.trim().toLowerCase();
  const exact = subjects.find(
    (s) => s.name.toLowerCase() === normalized || s.code.toLowerCase() === normalized,
  );
  if (exact) {
    return exact.id;
  }
  const partial = subjects.find(
    (s) => s.name.toLowerCase().includes(normalized) || normalized.includes(s.name.toLowerCase()),
  );
  return partial?.id ?? null;
}

// T16.4/T16.5: extracts proposed slots from an uploaded timetable image/PDF
// via ai.service.ts's parseTimetableImage, validates the raw response before
// trusting any of it (same discipline as planner.service.ts's
// generateStudyPlan), and returns them for review — this function never
// writes to TimetableSlot itself; a separate, existing createTimetableSlot
// call persists whatever the student confirms.
export async function parseTimetableUpload(
  userId: string,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<TimetableParseResult> {
  const imageBase64 = fileBuffer.toString('base64');
  const result = await aiService.parseTimetableImage(imageBase64, mimeType);

  if (result.refused) {
    throw new BadGatewayError(
      "The AI assistant couldn't read this timetable. Please try again or enter it manually.",
      'AI_TIMETABLE_REFUSED',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    throw new BadGatewayError(AI_INVALID_TIMETABLE_MESSAGE, 'AI_INVALID_TIMETABLE');
  }

  const validation = timetableAiResponseSchema.safeParse(parsed);
  if (!validation.success) {
    throw new BadGatewayError(AI_INVALID_TIMETABLE_MESSAGE, 'AI_INVALID_TIMETABLE');
  }

  const subjects = await prisma.subject.findMany({
    where: { userId },
    select: { id: true, name: true, code: true },
  });

  const slots: ProposedTimetableSlotResult[] = validation.data.slots.map((slot) => ({
    ...slot,
    matchedSubjectId: matchSubjectByName(slot.subjectName, subjects),
  }));

  return { slots };
}
