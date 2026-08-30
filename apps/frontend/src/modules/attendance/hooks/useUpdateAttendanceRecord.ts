'use client';

import type { AttendanceRecord, UpdateAttendanceInput } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAttendanceRecord } from '@/modules/attendance/api/attendance.api';
import { attendanceRecordsQueryKey, attendanceSummaryQueryKey } from '@/modules/attendance/hooks/queryKeys';

interface UpdateAttendanceRecordVariables {
  id: string;
  subjectId: string;
  input: UpdateAttendanceInput;
}

// Correcting a past record (T9.10) — not optimistic; this is an infrequent,
// deliberate edit rather than the fast daily-marking path, so a plain
// invalidate-on-success keeps it simple.
export function useUpdateAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation<AttendanceRecord, Error, UpdateAttendanceRecordVariables>({
    mutationFn: ({ id, input }) => updateAttendanceRecord(id, input),
    onSuccess: (_record, { subjectId }) => {
      queryClient.invalidateQueries({ queryKey: attendanceRecordsQueryKey(subjectId) });
      queryClient.invalidateQueries({ queryKey: attendanceSummaryQueryKey(subjectId) });
      queryClient.invalidateQueries({ queryKey: attendanceSummaryQueryKey() });
    },
  });
}
