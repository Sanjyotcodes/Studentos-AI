'use client';

import type { TimetableParseResult } from '@studentos/shared';
import { useMutation } from '@tanstack/react-query';
import { parseTimetableUpload } from '@/modules/timetable/api/timetable.api';

// T16.4: the result is proposal-only — nothing is persisted by this call, so
// there's no cache to update here. Confirming a proposed slot goes through
// the normal useCreateTimetableSlot mutation, one slot at a time.
export function useParseTimetableUpload() {
  return useMutation<TimetableParseResult, Error, File>({
    mutationFn: parseTimetableUpload,
  });
}
