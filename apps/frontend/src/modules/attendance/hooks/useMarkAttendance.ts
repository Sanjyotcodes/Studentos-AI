'use client';

import type { AttendanceRecord, AttendanceSummary, MarkAttendanceInput } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAttendance } from '@/modules/attendance/api/attendance.api';
import {
  attendanceRecordsQueryKey,
  attendanceSummaryQueryKey,
  todayAttendanceQueryKey,
} from '@/modules/attendance/hooks/queryKeys';
import { todayDateOnly } from '@/modules/attendance/utils/display';

interface MutationContext {
  previousRecords?: AttendanceRecord[];
  previousToday?: AttendanceRecord[];
  previousSubjectSummary?: AttendanceSummary;
  previousOverallSummary?: AttendanceSummary;
}

function patchRecordList(
  existing: AttendanceRecord[] | undefined,
  input: MarkAttendanceInput,
): AttendanceRecord[] {
  const list = existing ?? [];
  const now = new Date().toISOString();
  const matchIndex = list.findIndex((r) => r.subjectId === input.subjectId && r.date === input.date);
  if (matchIndex === -1) {
    const optimisticRecord: AttendanceRecord = {
      id: `optimistic-${input.subjectId}-${input.date}`,
      subjectId: input.subjectId,
      date: input.date,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };
    return [...list, optimisticRecord];
  }
  const updated = [...list];
  const existingRecord = updated[matchIndex];
  if (existingRecord) {
    updated[matchIndex] = { ...existingRecord, status: input.status, updatedAt: now };
  }
  return updated;
}

// Marking a day is optimistic at the record level only (T9.3): the day's row
// flips to the new status immediately, and a duplicate mark of the same day
// replaces the existing row in place rather than appending one (T9.4) — both
// are plain cache list operations, no arithmetic. The percentage/canMiss
// numbers are never guessed on the client (T9.5/T9.15's static "no
// percentage arithmetic in apps/frontend" rule) — the summary queries are
// invalidated so the real numbers come back from the backend, and on error
// every touched cache entry (records + both summaries) is restored from the
// pre-mutation snapshot, which is what actually rolls the UI back.
export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation<AttendanceRecord, Error, MarkAttendanceInput, MutationContext>({
    mutationFn: markAttendance,
    onMutate: async (input) => {
      const recordsKey = attendanceRecordsQueryKey(input.subjectId);
      const todayKey = todayAttendanceQueryKey(todayDateOnly());
      const subjectSummaryKey = attendanceSummaryQueryKey(input.subjectId);
      const overallSummaryKey = attendanceSummaryQueryKey();

      await Promise.all([
        queryClient.cancelQueries({ queryKey: recordsKey }),
        queryClient.cancelQueries({ queryKey: todayKey }),
        queryClient.cancelQueries({ queryKey: subjectSummaryKey }),
        queryClient.cancelQueries({ queryKey: overallSummaryKey }),
      ]);

      const previousRecords = queryClient.getQueryData<AttendanceRecord[]>(recordsKey);
      const previousToday = queryClient.getQueryData<AttendanceRecord[]>(todayKey);
      const previousSubjectSummary = queryClient.getQueryData<AttendanceSummary>(subjectSummaryKey);
      const previousOverallSummary = queryClient.getQueryData<AttendanceSummary>(overallSummaryKey);

      queryClient.setQueryData<AttendanceRecord[]>(recordsKey, (old) => patchRecordList(old, input));
      queryClient.setQueryData<AttendanceRecord[]>(todayKey, (old) => patchRecordList(old, input));

      return { previousRecords, previousToday, previousSubjectSummary, previousOverallSummary };
    },
    onError: (_err, input, context) => {
      const recordsKey = attendanceRecordsQueryKey(input.subjectId);
      const todayKey = todayAttendanceQueryKey(todayDateOnly());
      if (context?.previousRecords) {
        queryClient.setQueryData(recordsKey, context.previousRecords);
      }
      if (context?.previousToday) {
        queryClient.setQueryData(todayKey, context.previousToday);
      }
      if (context?.previousSubjectSummary) {
        queryClient.setQueryData(attendanceSummaryQueryKey(input.subjectId), context.previousSubjectSummary);
      }
      if (context?.previousOverallSummary) {
        queryClient.setQueryData(attendanceSummaryQueryKey(), context.previousOverallSummary);
      }
    },
    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({ queryKey: attendanceRecordsQueryKey(input.subjectId) });
      queryClient.invalidateQueries({ queryKey: todayAttendanceQueryKey(todayDateOnly()) });
      queryClient.invalidateQueries({ queryKey: attendanceSummaryQueryKey(input.subjectId) });
      queryClient.invalidateQueries({ queryKey: attendanceSummaryQueryKey() });
    },
  });
}
