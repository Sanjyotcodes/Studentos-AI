// Typed calls to the backend's /timetable routes. Goes through api-client
// (T7.9/T9.15), same as every other module's api/ folder.
import type {
  CreateTimetableSlotInput,
  TimetableParseResult,
  TimetableSlot,
  TimetableSlotFilterQuery,
  TimetableTodayResult,
  UpdateTimetableSlotInput,
} from '@studentos/shared';
import { apiClient } from '@/lib/api-client';

function toQueryString(query: TimetableSlotFilterQuery): string {
  const params = new URLSearchParams();
  if (query.dayOfWeek) params.set('dayOfWeek', query.dayOfWeek);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listTimetableSlots(query: TimetableSlotFilterQuery = {}): Promise<TimetableSlot[]> {
  return apiClient.get<TimetableSlot[]>(`/timetable${toQueryString(query)}`);
}

export function createTimetableSlot(input: CreateTimetableSlotInput): Promise<TimetableSlot> {
  return apiClient.post<TimetableSlot>('/timetable', input);
}

export function updateTimetableSlot(id: string, input: UpdateTimetableSlotInput): Promise<TimetableSlot> {
  return apiClient.patch<TimetableSlot>(`/timetable/${id}`, input);
}

export function deleteTimetableSlot(id: string): Promise<void> {
  return apiClient.delete<void>(`/timetable/${id}`);
}

export function getTodayTimetable(): Promise<TimetableTodayResult> {
  return apiClient.get<TimetableTodayResult>('/timetable/today');
}

// The only endpoint in this module that isn't plain JSON — the upload goes
// through api-client's dedicated multipart helper (upload()) rather than a
// raw fetch here, keeping api-client.ts the sole place allowed to call fetch.
export function parseTimetableUpload(file: File): Promise<TimetableParseResult> {
  return apiClient.upload<TimetableParseResult>('/timetable/parse', file);
}
