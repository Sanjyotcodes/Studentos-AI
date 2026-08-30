'use client';

import type { Mark } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMark } from '@/modules/grades/api/grades.api';
import { gradesSummaryQueryKey, marksQueryKey } from '@/modules/grades/hooks/queryKeys';

export function useDeleteMark() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteMark,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Mark[]>(marksQueryKey(), (old) => (old ? old.filter((m) => m.id !== id) : old));
      queryClient.invalidateQueries({ queryKey: gradesSummaryQueryKey });
    },
  });
}
