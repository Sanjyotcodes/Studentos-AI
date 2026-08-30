'use client';

import type { TimetableSlot } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { listTimetableSlots } from '@/modules/timetable/api/timetable.api';
import { timetableSlotsQueryKey } from '@/modules/timetable/hooks/queryKeys';

export function useTimetableSlots() {
  return useQuery<TimetableSlot[]>({
    queryKey: timetableSlotsQueryKey,
    queryFn: () => listTimetableSlots(),
  });
}
