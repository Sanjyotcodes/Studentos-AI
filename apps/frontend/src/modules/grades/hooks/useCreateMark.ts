'use client';

import type { CreateMarkInput, Mark } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMark } from '@/modules/grades/api/grades.api';
import { gradesSummaryQueryKey, marksQueryKey } from '@/modules/grades/hooks/queryKeys';

export function useCreateMark() {
  const queryClient = useQueryClient();

  return useMutation<Mark, Error, CreateMarkInput>({
    mutationFn: createMark,
    onSuccess: (mark) => {
      queryClient.setQueryData<Mark[]>(marksQueryKey(), (old) => (old ? [...old, mark] : [mark]));
      // The summary (weighted percentage, grade point, GPA) depends on every
      // mark for the affected subject — simplest correct approach is to
      // invalidate rather than try to recompute it on the client (PLAN.md
      // §4, invariant 10: that math lives only in grades.service.ts).
      queryClient.invalidateQueries({ queryKey: gradesSummaryQueryKey });
    },
  });
}
