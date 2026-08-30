'use client';

import type { TimetableSlot } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTimetableSlot } from '@/modules/timetable/api/timetable.api';
import { timetableSlotsQueryKey } from '@/modules/timetable/hooks/queryKeys';

export function useDeleteTimetableSlot() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteTimetableSlot,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<TimetableSlot[]>(timetableSlotsQueryKey, (old) =>
        old ? old.filter((s) => s.id !== id) : old,
      );
      queryClient.invalidateQueries({ queryKey: ['timetable', 'today'] });
    },
  });
}
