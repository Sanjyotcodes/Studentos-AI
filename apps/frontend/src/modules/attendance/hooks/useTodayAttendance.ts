'use client';

import type { AttendanceRecord } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { listAttendanceRecords } from '@/modules/attendance/api/attendance.api';
import { todayAttendanceQueryKey } from '@/modules/attendance/hooks/queryKeys';
import { todayDateOnly } from '@/modules/attendance/utils/display';

// One request for today's marks across every subject (omitting subjectId
// returns every owned record in range) — this is what the quick-mark row
// uses to know which subjects are already marked today, without an N+1
// per-subject fetch.
export function useTodayAttendance() {
  const today = todayDateOnly();
  return useQuery<AttendanceRecord[]>({
    queryKey: todayAttendanceQueryKey(today),
    queryFn: () => listAttendanceRecords({ from: today, to: today }),
  });
}
