// Centralised query keys so every hook and every cache read/write/invalidate
// in this module agrees on the same shape.
export const subjectsQueryKey = ['subjects'] as const;

export const attendanceSummaryQueryKey = (subjectId?: string) =>
  ['attendance', 'summary', subjectId ?? 'all'] as const;

export const attendanceRecordsQueryKey = (subjectId: string) =>
  ['attendance', 'records', subjectId] as const;

export const todayAttendanceQueryKey = (today: string) =>
  ['attendance', 'records', 'today', today] as const;
