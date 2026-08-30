'use client';

import type { GradesSummary } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { getGradesSummary } from '@/modules/grades/api/grades.api';
import { gradesSummaryQueryKey } from '@/modules/grades/hooks/queryKeys';

export function useGradesSummary() {
  return useQuery<GradesSummary>({
    queryKey: gradesSummaryQueryKey,
    queryFn: getGradesSummary,
  });
}
