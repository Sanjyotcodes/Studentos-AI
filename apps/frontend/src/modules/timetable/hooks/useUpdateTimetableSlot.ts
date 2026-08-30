'use client';

import type { TimetableSlot, UpdateTimetableSlotInput } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTimetableSlot } from '@/modules/timetable/api/timetable.api';
import { timetableSlotsQueryKey } from '@/modules/timetable/hooks/queryKeys';

export function useUpdateTimetableSlot() {
  const queryClient = useQueryClient();
  return useMutation<TimetableSlot, Error, { id: string; input: UpdateTimetableSlotInput }>({
    mutationFn: ({ id, input }) => updateTimetableSlot(id, input),
    onSuccess: (slot) => {
      queryClient.setQueryData<TimetableSlot[]>(timetableSlotsQueryKey, (old) =>
        old ? old.map((s) => (s.id === slot.id ? slot : s)) : [slot],
      );
      queryClient.invalidateQueries({ queryKey: ['timetable', 'today'] });
    },
  });
}
