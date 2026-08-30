'use client';

import type { StudyPlan } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { getStudyPlan } from '@/modules/planner/api/planner.api';
import { studyPlanQueryKey } from '@/modules/planner/hooks/queryKeys';

// A 404 (ApiClientError code "NO_STUDY_PLAN") is an expected, normal state
// for an account that hasn't generated a plan yet — not retried, since
// retrying a 404 would just repeat the same "not found" three times.
export function useStudyPlan() {
  return useQuery<StudyPlan>({
    queryKey: studyPlanQueryKey,
    queryFn: getStudyPlan,
    retry: false,
  });
}
