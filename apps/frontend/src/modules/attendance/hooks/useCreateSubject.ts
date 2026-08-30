'use client';

import type { CreateSubjectInput, Subject } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSubject } from '@/modules/attendance/api/subjects.api';
import { attendanceSummaryQueryKey, subjectsQueryKey } from '@/modules/attendance/hooks/queryKeys';

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation<Subject, Error, CreateSubjectInput>({
    mutationFn: createSubject,
    onSuccess: (subject) => {
      // Seed the list cache directly so the new subject appears immediately
      // (T9.2), then invalidate the summary (percentage/canMiss for a
      // brand-new subject only the backend can compute).
      queryClient.setQueryData<Subject[]>(subjectsQueryKey, (old) =>
        old ? [...old, subject] : [subject],
      );
      queryClient.invalidateQueries({ queryKey: attendanceSummaryQueryKey() });
    },
  });
}
