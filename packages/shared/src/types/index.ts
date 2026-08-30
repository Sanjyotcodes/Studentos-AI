// Shared TypeScript types (User, Subject, AttendanceRecord, Task, API response envelopes).
//
// These describe API *response* shapes returned to the client, as opposed to
// the request-payload types in ../schemas (which are inferred with z.infer).
// There's no response-validation schema to infer these from, so they're
// hand-written once, here, and nowhere else (see PLAN.md §4, invariant 1).
import type { AssessmentType, AttendanceStatus, DayOfWeek, TaskPriority, TaskStatus } from '../constants';
import type { NoteBlock, ProposedTimetableSlot, StudyPlanEntry } from '../schemas';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  code: string;
  totalClassesRequired: number | null;
  minAttendancePercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceRiskStatus = 'SAFE' | 'AT_RISK';

// Per-subject attendance figures plus cutoff prediction, as returned by
// GET /api/attendance/summary. attended/total exclude CANCELLED and HOLIDAY
// records from both sides (see PLAN.md §3, Phase 6; Phase 16 for HOLIDAY);
// percentage is null (never NaN) when total is zero. canMiss/mustAttend are
// computed once, in attendance.service.ts, and never recomputed on the
// frontend (PLAN.md §4, invariant 10).
export interface SubjectAttendanceSummary {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  attended: number;
  total: number;
  percentage: number | null;
  minAttendancePercent: number;
  status: AttendanceRiskStatus;
  canMiss: number;
  mustAttend: number;
}

export interface AttendanceSummary {
  subjects: SubjectAttendanceSummary[];
  overall: {
    attended: number;
    total: number;
    percentage: number | null;
  };
}

export interface Task {
  id: string;
  userId: string;
  subjectId: string | null;
  title: string;
  notes: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

// The block shape itself (paragraph/heading/list/code) is validated by
// noteBlockSchema in ../schemas — re-exported as a type here rather than
// re-declared, since Note.blocks and the create/update payload shapes must
// stay identical (T12.2: blocks round-trip without loss or reordering).
export type { NoteBlock };

export interface Note {
  id: string;
  userId: string;
  subjectId: string | null;
  title: string;
  blocks: NoteBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface AiNoteSummaryResult {
  summary: string;
  refused: boolean;
}

export interface ExamDate {
  id: string;
  userId: string;
  subjectId: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// The entry shape itself is validated by studyPlanEntrySchema in ../schemas
// (same re-export pattern as NoteBlock above) — it's both what the AI's raw
// response is checked against and what StudyPlan.entries stores.
export type { StudyPlanEntry };

export interface StudyPlan {
  id: string;
  userId: string;
  entries: StudyPlanEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Mark {
  id: string;
  userId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  label: string | null;
  scored: number;
  max: number;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

// Per-subject grade figures, as returned by GET /api/grades/summary.
// weightedPercentage/gradePoint are null when the subject has no marks yet
// (T14.4) — never NaN, and never a silent 0 that could be misread as an
// actual zero score. Computed once, in grades.service.ts, and never
// recomputed on the frontend (PLAN.md §4, invariant 10 — same discipline as
// SubjectAttendanceSummary above).
export interface SubjectGradeSummary {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  totalWeightRecorded: number;
  weightedPercentage: number | null;
  gradePoint: number | null;
}

// gpa is never null/NaN — 0 when no subject has any marks recorded (T14.4).
export interface GradesSummary {
  subjects: SubjectGradeSummary[];
  gpa: number;
}

export interface TimetableSlot {
  id: string;
  userId: string;
  subjectId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

// The proposed-slot shape itself is validated by proposedTimetableSlotSchema
// in ../schemas (same re-export pattern as NoteBlock/StudyPlanEntry above)
// — it's what the AI's raw response is checked against, and what
// POST /api/timetable/parse returns for review (T16.4: never persisted
// directly).
export type { ProposedTimetableSlot };

export interface ProposedTimetableSlotResult extends ProposedTimetableSlot {
  // Best-effort case-insensitive match against the student's existing
  // subjects, computed server-side — null when no confident match was
  // found, in which case the reviewer must pick one manually.
  matchedSubjectId: string | null;
}

export interface TimetableParseResult {
  slots: ProposedTimetableSlotResult[];
}

export interface TimetableTodayResult {
  dayOfWeek: DayOfWeek;
  subjectIds: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

// Both AI routes share this shape: `refused` is true when Gemini's safety
// classifiers blocked the request (a prompt-level blockReason, or a
// candidate finishReason like SAFETY/PROHIBITED_CONTENT) — the text is
// still a friendly, displayable message in that case, never empty (see
// ai.service.ts, PLAN.md §3.4).
export interface AiQueryResult {
  answer: string;
  refused: boolean;
}

export interface AiSummaryResult {
  summary: string;
  refused: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiError {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
