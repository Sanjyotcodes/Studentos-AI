// Shared constants: default attendance cutoff, status/priority enums (mirroring
// the Prisma enums by value, without importing @prisma/client — packages/shared
// stays framework-agnostic per PLAN.md §4), and generic error codes.

/** Default minimum attendance percentage applied to a new Subject when none is given. */
export const DEFAULT_ATTENDANCE_CUTOFF = 75;

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'CANCELLED', 'HOLIDAY'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const NOTE_BLOCK_TYPES = ['paragraph', 'heading', 'list', 'code'] as const;
export type NoteBlockType = (typeof NOTE_BLOCK_TYPES)[number];

export const ASSESSMENT_TYPES = ['QUIZ', 'ASSIGNMENT', 'MIDTERM', 'FINAL', 'LAB', 'OTHER'] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// Percentage-to-grade-point bands for the default 10-point scale (Phase 14).
// Ordered highest-to-lowest so the first band whose minPercent a percentage
// meets or exceeds is its grade — see grades.service.ts's
// percentageToGradePoint, the one place this table is consumed. Kept as a
// plain, isolated data structure (not scattered if/else logic) so it's the
// single thing a future institution-specific scheme would replace.
export interface GradeBand {
  minPercent: number;
  gradePoint: number;
}

export const DEFAULT_GRADING_SCHEME: readonly GradeBand[] = [
  { minPercent: 90, gradePoint: 10 },
  { minPercent: 80, gradePoint: 9 },
  { minPercent: 70, gradePoint: 8 },
  { minPercent: 60, gradePoint: 7 },
  { minPercent: 50, gradePoint: 6 },
  { minPercent: 40, gradePoint: 5 },
  { minPercent: 0, gradePoint: 0 },
];

// The generic, cross-cutting error codes emitted by the backend's central error
// middleware (see AppError.ts). Feature-specific codes (e.g. "EMAIL_IN_USE")
// stay ad-hoc strings at their call sites, per AppError.ts's own documented
// design — AppErrorCode is intentionally an open string, not a closed union.
export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
