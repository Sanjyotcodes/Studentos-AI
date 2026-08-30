'use client';

import type { AttendanceSummary } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { getAttendanceSummary } from '@/modules/attendance/api/attendance.api';
import { attendanceSummaryQueryKey } from '@/modules/attendance/hooks/queryKeys';

// subjectId omitted → overall summary across every subject (dashboard
// overview + attendance list page). Passed → single-subject summary (detail
// page's own cutoff/canMiss/mustAttend row).
export function useAttendanceSummary(subjectId?: string) {
  return useQuery<AttendanceSummary>({
    queryKey: attendanceSummaryQueryKey(subjectId),
    queryFn: () => getAttendanceSummary(subjectId ? { subjectId } : {}),
  });
}
