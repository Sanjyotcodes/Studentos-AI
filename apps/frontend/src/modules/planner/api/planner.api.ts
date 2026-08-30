// Typed calls to the backend's /study-plan routes. All go through apiClient
// (T7.9-style invariant) — nothing here calls fetch directly.
import type { StudyPlan } from '@studentos/shared';
import { apiClient } from '@/lib/api-client';

export function getStudyPlan(): Promise<StudyPlan> {
  return apiClient.get<StudyPlan>('/study-plan');
}

export function generateStudyPlan(): Promise<StudyPlan> {
  return apiClient.post<StudyPlan>('/study-plan/generate');
}
