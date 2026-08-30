'use client';

import type { Subject, UpdateSubjectInput } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSubject } from '@/modules/attendance/api/subjects.api';
import { attendanceSummaryQueryKey, subjectsQueryKey } from '@/modules/attendance/hooks/queryKeys';

interface UpdateSubjectVariables {
  id: string;
  input: UpdateSubjectInput;
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation<Subject, Error, UpdateSubjectVariables>({
    mutationFn: ({ id, input }) => updateSubject(id, input),
    onSuccess: (subject) => {
      queryClient.setQueryData<Subject[]>(subjectsQueryKey, (old) =>
        old ? old.map((s) => (s.id === subject.id ? subject : s)) : old,
      );
      // A cutoff change (minAttendancePercent) changes canMiss/mustAttend —
      // only the backend recomputes those, so refetch rather than guess.
      queryClient.invalidateQueries({ queryKey: attendanceSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: attendanceSummaryQueryKey(subject.id) });
    },
  });
}
