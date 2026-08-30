'use client';

import type { ExamDate } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteExamDate } from '@/modules/examDates/api/examDates.api';
import { examDatesQueryKey } from '@/modules/examDates/hooks/queryKeys';

export function useDeleteExamDate() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteExamDate,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ExamDate[]>(examDatesQueryKey, (old) => (old ? old.filter((e) => e.id !== id) : old));
    },
  });
}
