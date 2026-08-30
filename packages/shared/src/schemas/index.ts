// Zod schemas shared by frontend and backend — single source of truth for
// request-payload validation. Every *Input type below is inferred with
// z.infer, never hand-written a second time.
import { z } from 'zod';
import {
  ASSESSMENT_TYPES,
  ATTENDANCE_STATUSES,
  DAYS_OF_WEEK,
  DEFAULT_ATTENDANCE_CUTOFF,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../constants';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// --- Subjects ---------------------------------------------------------------

const subjectNameSchema = z
  .string()
  .trim()
  .min(1, 'Subject name is required')
  .max(100, 'Subject name is too long');

const subjectCodeSchema = z
  .string()
  .trim()
  .min(1, 'Subject code is required')
  .max(20, 'Subject code is too long');

const totalClassesRequiredSchema = z
  .number()
  .int('Total classes required must be a whole number')
  .positive('Total classes required must be greater than zero');

const minAttendancePercentSchema = z
  .number()
  .int('Minimum attendance percent must be a whole number')
  .min(0, 'Minimum attendance percent cannot be negative')
  .max(100, 'Minimum attendance percent cannot exceed 100');

export const createSubjectSchema = z.object({
  name: subjectNameSchema,
  code: subjectCodeSchema,
  totalClassesRequired: totalClassesRequiredSchema.optional(),
  minAttendancePercent: minAttendancePercentSchema.default(DEFAULT_ATTENDANCE_CUTOFF),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const updateSubjectSchema = z.object({
  name: subjectNameSchema.optional(),
  code: subjectCodeSchema.optional(),
  totalClassesRequired: totalClassesRequiredSchema.nullable().optional(),
  minAttendancePercent: minAttendancePercentSchema.optional(),
});
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

// --- Attendance --------------------------------------------------------------

// Attendance is tracked per calendar day (see PLAN.md §9 — attendance
// granularity), so the wire format is a plain date, not a full timestamp.
// Exported: Phase 13's exam-date and study-plan-entry schemas reuse this
// exact format rather than redefining it.
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

function isNotFutureDate(dateStr: string): boolean {
  const todayUtc = new Date().toISOString().slice(0, 10);
  return dateStr <= todayUtc;
}

function isNotPastDate(dateStr: string): boolean {
  const todayUtc = new Date().toISOString().slice(0, 10);
  return dateStr >= todayUtc;
}

export const markAttendanceSchema = z
  .object({
    subjectId: z.string().uuid('subjectId must be a valid UUID'),
    date: dateOnlySchema,
    status: z.enum(ATTENDANCE_STATUSES),
  })
  .refine((data) => isNotFutureDate(data.date), {
    message: 'Attendance date cannot be in the future',
    path: ['date'],
  });
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const updateAttendanceSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES),
});
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;

export const attendanceSummaryQuerySchema = z.object({
  subjectId: z.string().uuid('subjectId must be a valid UUID').optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});
export type AttendanceSummaryQuery = z.infer<typeof attendanceSummaryQuerySchema>;

// --- Tasks -------------------------------------------------------------------

const taskTitleSchema = z.string().trim().min(1, 'Title is required').max(200, 'Title is too long');

const taskNotesSchema = z.string().trim().max(2000, 'Notes are too long');

// Same per-day granularity as attendance (PLAN.md §9) — a task is "due on a
// day," not at a specific minute. No reminders/notifications means no need
// for time-of-day precision (Phase 11 non-goals).
export const createTaskSchema = z.object({
  title: taskTitleSchema,
  notes: taskNotesSchema.optional(),
  dueDate: dateOnlySchema.optional(),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  status: z.enum(TASK_STATUSES).default('TODO'),
  subjectId: z.string().uuid('subjectId must be a valid UUID').optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: taskTitleSchema.optional(),
  notes: taskNotesSchema.nullable().optional(),
  dueDate: dateOnlySchema.nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  subjectId: z.string().uuid('subjectId must be a valid UUID').nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskFilterQuerySchema = z.object({
  subjectId: z.string().uuid('subjectId must be a valid UUID').optional(),
  status: z.enum(TASK_STATUSES).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});
export type TaskFilterQuery = z.infer<typeof taskFilterQuerySchema>;

// --- Notes -------------------------------------------------------------------

// Block ids are client-generated (crypto.randomUUID() in the editor) — they
// exist for React keys and stable editing, not server-side identity.
const noteBlockIdSchema = z.string().trim().min(1, 'Block id is required').max(100, 'Block id is too long');

const paragraphBlockSchema = z.object({
  id: noteBlockIdSchema,
  type: z.literal('paragraph'),
  text: z.string().max(10_000, 'Paragraph text is too long'),
});

const headingBlockSchema = z.object({
  id: noteBlockIdSchema,
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().max(300, 'Heading text is too long'),
});

const listBlockSchema = z.object({
  id: noteBlockIdSchema,
  type: z.literal('list'),
  items: z.array(z.string().max(1000, 'List item is too long')).max(200, 'Too many list items'),
});

const codeBlockSchema = z.object({
  id: noteBlockIdSchema,
  type: z.literal('code'),
  code: z.string().max(20_000, 'Code block is too long'),
  language: z.string().trim().max(50, 'Language name is too long').optional(),
});

// Discriminated on `type` so a malformed or unknown block type fails
// validation with a precise error instead of silently matching the wrong
// shape (T12.3: malformed block payload -> 400, nothing persisted).
export const noteBlockSchema = z.discriminatedUnion('type', [
  paragraphBlockSchema,
  headingBlockSchema,
  listBlockSchema,
  codeBlockSchema,
]);
export type NoteBlock = z.infer<typeof noteBlockSchema>;

const noteTitleSchema = z.string().trim().min(1, 'Title is required').max(200, 'Title is too long');
const noteBlocksArraySchema = z.array(noteBlockSchema).max(500, 'A note cannot have more than 500 blocks');

export const createNoteSchema = z.object({
  title: noteTitleSchema.default('Untitled'),
  subjectId: z.string().uuid('subjectId must be a valid UUID').optional(),
  blocks: noteBlocksArraySchema.default([]),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z.object({
  title: noteTitleSchema.optional(),
  subjectId: z.string().uuid('subjectId must be a valid UUID').nullable().optional(),
  blocks: noteBlocksArraySchema.optional(),
});
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export const noteFilterQuerySchema = z.object({
  subjectId: z.string().uuid('subjectId must be a valid UUID').optional(),
});
export type NoteFilterQuery = z.infer<typeof noteFilterQuerySchema>;

// --- Exam dates ----------------------------------------------------------

// Upsert-by-subject (T13.3: a past date is rejected here, at the same
// validation layer as every other input, not left to the planner to catch).
export const upsertExamDateSchema = z
  .object({
    subjectId: z.string().uuid('subjectId must be a valid UUID'),
    date: dateOnlySchema,
  })
  .refine((data) => isNotPastDate(data.date), {
    message: 'Exam date cannot be in the past',
    path: ['date'],
  });
export type UpsertExamDateInput = z.infer<typeof upsertExamDateSchema>;

// --- Study planner ---------------------------------------------------------

// The shape the AI's raw JSON response must match before it's trusted enough
// to persist (T13.4). Content-level checks the shape alone can't express
// (date within the requested range, subjectId among the subjects actually
// sent) are applied afterward in planner.service.ts, since those bounds are
// per-request, not a fixed schema.
export const studyPlanEntrySchema = z.object({
  date: dateOnlySchema,
  subjectId: z.string().uuid('subjectId must be a valid UUID'),
  subjectName: z.string().trim().min(1, 'subjectName is required'),
  activity: z.string().trim().min(1, 'activity is required').max(500, 'activity is too long'),
});
export type StudyPlanEntry = z.infer<typeof studyPlanEntrySchema>;

export const studyPlanAiResponseSchema = z.object({
  entries: z
    .array(studyPlanEntrySchema)
    .min(1, 'Plan must include at least one entry')
    .max(500, 'Plan has too many entries'),
});
export type StudyPlanAiResponse = z.infer<typeof studyPlanAiResponseSchema>;

// --- Grades / marks ----------------------------------------------------------

const markLabelSchema = z.string().trim().max(100, 'Label is too long');
const markScoredSchema = z.number().min(0, 'Scored cannot be negative');
const markMaxSchema = z.number().positive('Max must be greater than zero');
// Weight is relative, not a literal percentage that must sum to 100 across a
// subject's marks — grades.service.ts normalizes by the sum actually
// recorded (T14.5). Still bounded so a typo (e.g. "1000" meant as "100")
// can't dominate every other mark silently.
const markWeightSchema = z.number().positive('Weight must be greater than zero').max(1000, 'Weight is too large');

// scored <= max is enforced in grades.service.ts, not here — an update may
// change only `scored` (or only `max`), and only the service layer has the
// existing stored value to compare a partial payload against (T14.2).
export const createMarkSchema = z.object({
  subjectId: z.string().uuid('subjectId must be a valid UUID'),
  assessmentType: z.enum(ASSESSMENT_TYPES),
  label: markLabelSchema.optional(),
  scored: markScoredSchema,
  max: markMaxSchema,
  weight: markWeightSchema,
});
export type CreateMarkInput = z.infer<typeof createMarkSchema>;

export const updateMarkSchema = z.object({
  assessmentType: z.enum(ASSESSMENT_TYPES).optional(),
  label: markLabelSchema.nullable().optional(),
  scored: markScoredSchema.optional(),
  max: markMaxSchema.optional(),
  weight: markWeightSchema.optional(),
});
export type UpdateMarkInput = z.infer<typeof updateMarkSchema>;

export const markFilterQuerySchema = z.object({
  subjectId: z.string().uuid('subjectId must be a valid UUID').optional(),
});
export type MarkFilterQuery = z.infer<typeof markFilterQuerySchema>;

// --- Timetable -----------------------------------------------------------

// "HH:mm" 24-hour strings — comparison/overlap logic (timetable.service.ts)
// relies on zero-padded lexicographic string comparison being equivalent to
// chronological comparison, so no time-parsing is needed for it.
const timeOnlySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm 24-hour format');

export const createTimetableSlotSchema = z
  .object({
    subjectId: z.string().uuid('subjectId must be a valid UUID'),
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    startTime: timeOnlySchema,
    endTime: timeOnlySchema,
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
export type CreateTimetableSlotInput = z.infer<typeof createTimetableSlotSchema>;

// Cross-field startTime < endTime for a *partial* update needs the existing
// stored values merged in first — same reasoning as grades.service.ts's
// scored<=max check (T14.2) — so that check lives in timetable.service.ts,
// not here.
export const updateTimetableSlotSchema = z.object({
  subjectId: z.string().uuid('subjectId must be a valid UUID').optional(),
  dayOfWeek: z.enum(DAYS_OF_WEEK).optional(),
  startTime: timeOnlySchema.optional(),
  endTime: timeOnlySchema.optional(),
});
export type UpdateTimetableSlotInput = z.infer<typeof updateTimetableSlotSchema>;

export const timetableSlotFilterQuerySchema = z.object({
  dayOfWeek: z.enum(DAYS_OF_WEEK).optional(),
});
export type TimetableSlotFilterQuery = z.infer<typeof timetableSlotFilterQuerySchema>;

// GET /api/timetable/today accepts the client's own local "today" (optional
// — defaults to the server's date if omitted) rather than only ever trusting
// the server's clock, same reasoning as markAttendance already accepting an
// explicit date instead of assuming server "today".
export const timetableTodayQuerySchema = z.object({
  date: dateOnlySchema.optional(),
});
export type TimetableTodayQuery = z.infer<typeof timetableTodayQuerySchema>;

// The shape POST /api/timetable/parse asks Gemini to respond in (T16.4,
// T16.5) — subjectName is raw extracted text, not a subjectId, since the AI
// has no knowledge of the student's actual Subject rows; the server
// best-effort-matches it against their real subjects afterward, and the
// reviewer confirms/corrects before anything is persisted.
export const proposedTimetableSlotSchema = z
  .object({
    subjectName: z.string().trim().min(1, 'subjectName is required').max(200, 'subjectName is too long'),
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    startTime: timeOnlySchema,
    endTime: timeOnlySchema,
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
export type ProposedTimetableSlot = z.infer<typeof proposedTimetableSlotSchema>;

export const timetableAiResponseSchema = z.object({
  slots: z.array(proposedTimetableSlotSchema).max(100, 'Too many slots extracted'),
});
export type TimetableAiResponse = z.infer<typeof timetableAiResponseSchema>;

// --- AI ------------------------------------------------------------------

export const aiQuerySchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(500, 'Question is too long'),
});
export type AiQueryInput = z.infer<typeof aiQuerySchema>;

export const summarizeNoteSchema = z.object({
  noteId: z.string().uuid('noteId must be a valid UUID'),
});
export type SummarizeNoteInput = z.infer<typeof summarizeNoteSchema>;
