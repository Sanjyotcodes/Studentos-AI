'use client';

import type { Mark } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { listMarks } from '@/modules/grades/api/grades.api';
import { marksQueryKey } from '@/modules/grades/hooks/queryKeys';

export function useMarks() {
  return useQuery<Mark[]>({
    queryKey: marksQueryKey(),
    queryFn: () => listMarks(),
  });
}
