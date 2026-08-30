'use client';

import type { Subject } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { listSubjects } from '@/modules/attendance/api/subjects.api';
import { subjectsQueryKey } from '@/modules/attendance/hooks/queryKeys';

export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: subjectsQueryKey,
    queryFn: listSubjects,
  });
}
