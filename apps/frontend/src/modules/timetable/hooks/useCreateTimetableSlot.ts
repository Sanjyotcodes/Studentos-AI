'use client';

import type { CreateTimetableSlotInput, TimetableSlot } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTimetableSlot } from '@/modules/timetable/api/timetable.api';
import { timetableSlotsQueryKey } from '@/modules/timetable/hooks/queryKeys';

export function useCreateTimetableSlot() {
  const queryClient = useQueryClient();
  return useMutation<TimetableSlot, Error, CreateTimetableSlotInput>({
    mutationFn: createTimetableSlot,
    onSuccess: (slot) => {
      queryClient.setQueryData<TimetableSlot[]>(timetableSlotsQueryKey, (old) =>
        old ? [...old, slot] : [slot],
      );
      // A newly-added slot can change today's scheduled subjects, so any
      // cached "today" lookups (attendance quick-mark defaults, T16.6) must
      // not keep serving a stale answer.
      queryClient.invalidateQueries({ queryKey: ['timetable', 'today'] });
    },
  });
}
