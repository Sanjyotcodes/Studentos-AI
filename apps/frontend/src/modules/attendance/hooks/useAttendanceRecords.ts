'use client';

import type { AttendanceRecord } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { listAttendanceRecords } from '@/modules/attendance/api/attendance.api';
import { attendanceRecordsQueryKey } from '@/modules/attendance/hooks/queryKeys';

// Full history for one subject, newest first — powers the subject detail
// page's history list (T9.10).
export function useAttendanceRecords(subjectId: string) {
  return useQuery<AttendanceRecord[]>({
    queryKey: attendanceRecordsQueryKey(subjectId),
    queryFn: () => listAttendanceRecords({ subjectId }),
    select: (records) => [...records].sort((a, b) => b.date.localeCompare(a.date)),
  });
}
