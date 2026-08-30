'use client';

import type { Subject } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSubject } from '@/modules/attendance/api/subjects.api';
import { attendanceSummaryQueryKey, subjectsQueryKey } from '@/modules/attendance/hooks/queryKeys';

export function useDeleteSubject() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteSubject,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Subject[]>(subjectsQueryKey, (old) =>
        old ? old.filter((s) => s.id !== id) : old,
      );
      queryClient.invalidateQueries({ queryKey: attendanceSummaryQueryKey() });
      queryClient.removeQueries({ queryKey: attendanceSummaryQueryKey(id) });
    },
  });
}
