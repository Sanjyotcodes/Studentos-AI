// Typed calls to the backend's /attendance routes. All go through api-client
// (T7.9/T9.15) — nothing here calls fetch directly, and nothing here does
// any percentage/prediction arithmetic. GET /attendance/summary is the sole
// source of truth for percentage/canMiss/mustAttend (PLAN.md §4 invariant 10).
import type {
  AttendanceRecord,
  AttendanceSummary,
  AttendanceSummaryQuery,
  MarkAttendanceInput,
  UpdateAttendanceInput,
} from '@studentos/shared';
import { apiClient } from '@/lib/api-client';

function toQueryString(query: AttendanceSummaryQuery): string {
  const params = new URLSearchParams();
  if (query.subjectId) params.set('subjectId', query.subjectId);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listAttendanceRecords(query: AttendanceSummaryQuery = {}): Promise<AttendanceRecord[]> {
  return apiClient.get<AttendanceRecord[]>(`/attendance${toQueryString(query)}`);
}

export function getAttendanceSummary(query: AttendanceSummaryQuery = {}): Promise<AttendanceSummary> {
  return apiClient.get<AttendanceSummary>(`/attendance/summary${toQueryString(query)}`);
}

// Idempotent upsert on the backend — marking the same subject+date twice
// returns 200 with the same record rather than creating a duplicate (T9.4).
export function markAttendance(input: MarkAttendanceInput): Promise<AttendanceRecord> {
  return apiClient.post<AttendanceRecord>('/attendance', input);
}

export function updateAttendanceRecord(id: string, input: UpdateAttendanceInput): Promise<AttendanceRecord> {
  return apiClient.patch<AttendanceRecord>(`/attendance/${id}`, input);
}

export function deleteAttendanceRecord(id: string): Promise<void> {
  return apiClient.delete<void>(`/attendance/${id}`);
}
