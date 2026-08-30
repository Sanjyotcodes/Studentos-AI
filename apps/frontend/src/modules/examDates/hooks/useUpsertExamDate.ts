'use client';

import type { ExamDate, UpsertExamDateInput } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertExamDate } from '@/modules/examDates/api/examDates.api';
import { examDatesQueryKey } from '@/modules/examDates/hooks/queryKeys';

export function useUpsertExamDate() {
  const queryClient = useQueryClient();

  return useMutation<ExamDate, Error, UpsertExamDateInput>({
    mutationFn: upsertExamDate,
    onSuccess: (examDate) => {
      queryClient.setQueryData<ExamDate[]>(examDatesQueryKey, (old) => {
        if (!old) return [examDate];
        const withoutSubject = old.filter((e) => e.subjectId !== examDate.subjectId);
        return [...withoutSubject, examDate];
      });
    },
  });
}
