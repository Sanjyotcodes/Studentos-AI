'use client';

import type { StudyPlan } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateStudyPlan } from '@/modules/planner/api/planner.api';
import { studyPlanQueryKey } from '@/modules/planner/hooks/queryKeys';

// Same mutation for the first generation and every later "Regenerate" click
// — the backend upserts, so calling this again always replaces the cached
// plan rather than ever appending a second one (T13.7).
export function useGenerateStudyPlan() {
  const queryClient = useQueryClient();

  return useMutation<StudyPlan, Error, void>({
    mutationFn: generateStudyPlan,
    onSuccess: (plan) => {
      queryClient.setQueryData<StudyPlan>(studyPlanQueryKey, plan);
    },
  });
}
