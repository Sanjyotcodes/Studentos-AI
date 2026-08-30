// Typed calls to the backend's /grades routes. All go through apiClient
// (T7.9-style invariant) — nothing here calls fetch directly, and nothing
// here recomputes a percentage or GPA (that stays in grades.service.ts).
import type { CreateMarkInput, GradesSummary, Mark, MarkFilterQuery, UpdateMarkInput } from '@studentos/shared';
import { apiClient } from '@/lib/api-client';

function toQueryString(query: MarkFilterQuery): string {
  const params = new URLSearchParams();
  if (query.subjectId) params.set('subjectId', query.subjectId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listMarks(query: MarkFilterQuery = {}): Promise<Mark[]> {
  return apiClient.get<Mark[]>(`/grades${toQueryString(query)}`);
}

export function createMark(input: CreateMarkInput): Promise<Mark> {
  return apiClient.post<Mark>('/grades', input);
}

export function updateMark(id: string, input: UpdateMarkInput): Promise<Mark> {
  return apiClient.patch<Mark>(`/grades/${id}`, input);
}

export function deleteMark(id: string): Promise<void> {
  return apiClient.delete<void>(`/grades/${id}`);
}

export function getGradesSummary(): Promise<GradesSummary> {
  return apiClient.get<GradesSummary>('/grades/summary');
}
