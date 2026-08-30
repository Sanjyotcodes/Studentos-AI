'use client';

import type { ExamDate } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { listExamDates } from '@/modules/examDates/api/examDates.api';
import { examDatesQueryKey } from '@/modules/examDates/hooks/queryKeys';

export function useExamDates() {
  return useQuery<ExamDate[]>({
    queryKey: examDatesQueryKey,
    queryFn: listExamDates,
  });
}
