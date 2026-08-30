// Typed calls to the backend's /subjects routes. All go through api-client
// (T7.9/T9.15) — nothing here calls fetch directly, and nothing here does
// any percentage/prediction arithmetic (that lives solely in the backend's
// attendance.service.ts per PLAN.md §4 invariant 10).
import type { CreateSubjectInput, UpdateSubjectInput } from '@studentos/shared';
import type { Subject } from '@studentos/shared';
import { apiClient } from '@/lib/api-client';

export function listSubjects(): Promise<Subject[]> {
  return apiClient.get<Subject[]>('/subjects');
}

export function createSubject(input: CreateSubjectInput): Promise<Subject> {
  return apiClient.post<Subject>('/subjects', input);
}

export function updateSubject(id: string, input: UpdateSubjectInput): Promise<Subject> {
  return apiClient.patch<Subject>(`/subjects/${id}`, input);
}

export function deleteSubject(id: string): Promise<void> {
  return apiClient.delete<void>(`/subjects/${id}`);
}
