// Typed calls to the backend's /exam-dates routes. All go through apiClient
// (T7.9-style invariant) — nothing here calls fetch directly.
import type { ExamDate, UpsertExamDateInput } from '@studentos/shared';
import { apiClient } from '@/lib/api-client';

export function listExamDates(): Promise<ExamDate[]> {
  return apiClient.get<ExamDate[]>('/exam-dates');
}

export function upsertExamDate(input: UpsertExamDateInput): Promise<ExamDate> {
  return apiClient.post<ExamDate>('/exam-dates', input);
}

export function deleteExamDate(id: string): Promise<void> {
  return apiClient.delete<void>(`/exam-dates/${id}`);
}
