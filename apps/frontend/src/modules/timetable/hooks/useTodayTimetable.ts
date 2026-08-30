'use client';

import type { TimetableTodayResult } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { todayDateOnly } from '@/modules/attendance/utils/display';
import { getTodayTimetable } from '@/modules/timetable/api/timetable.api';
import { timetableTodayQueryKey } from '@/modules/timetable/hooks/queryKeys';

// T16.6: which subjects are scheduled today, per the timetable — used to
// surface today's classes first on the attendance page. Marking any other
// subject (or any other day, via history corrections) still works exactly as
// before; this only affects ordering/emphasis, never what can be marked.
export function useTodayTimetable() {
  const today = todayDateOnly();
  return useQuery<TimetableTodayResult>({
    queryKey: timetableTodayQueryKey(today),
    queryFn: getTodayTimetable,
  });
}
