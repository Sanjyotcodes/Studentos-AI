'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAttendanceRecord } from '@/modules/attendance/api/attendance.api';
import { attendanceRecordsQueryKey, attendanceSummaryQueryKey } from '@/modules/attendance/hooks/queryKeys';

interface DeleteAttendanceRecordVariables {
  id: string;
  subjectId: string;
}

export function useDeleteAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteAttendanceRecordVariables>({
    mutationFn: ({ id }) => deleteAttendanceRecord(id),
    onSuccess: (_data, { subjectId }) => {
      queryClient.invalidateQueries({ queryKey: attendanceRecordsQueryKey(subjectId) });
      queryClient.invalidateQueries({ queryKey: attendanceSummaryQueryKey(subjectId) });
      queryClient.invalidateQueries({ queryKey: attendanceSummaryQueryKey() });
    },
  });
}
