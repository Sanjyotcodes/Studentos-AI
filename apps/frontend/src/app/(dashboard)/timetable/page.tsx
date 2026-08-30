'use client';

import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { useSubjects } from '@/modules/attendance/hooks/useSubjects';
import { TimetableUploadReview } from '@/modules/timetable/components/TimetableUploadReview';
import { TimetableWeekGrid } from '@/modules/timetable/components/TimetableWeekGrid';
import { useTimetableSlots } from '@/modules/timetable/hooks/useTimetableSlots';

export default function TimetablePage() {
  const subjectsQuery = useSubjects();
  const slotsQuery = useTimetableSlots();

  if (subjectsQuery.isLoading || slotsQuery.isLoading) {
    return <LoadingBlock label="Loading your timetable…" />;
  }
  if (subjectsQuery.isError || slotsQuery.isError) {
    return (
      <ErrorState
        onRetry={() => {
          subjectsQuery.refetch();
          slotsQuery.refetch();
        }}
      />
    );
  }

  const subjects = subjectsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Timetable</h1>

      {/* Uploading a timetable can create its own subjects (T16 follow-up),
          so this is never gated on already having one — unlike the manual
          weekly grid below, which still needs an existing subject to link a
          slot to and shows its own "add a subject first" empty state. */}
      <TimetableUploadReview subjects={subjects} />
      <TimetableWeekGrid slots={slotsQuery.data ?? []} subjects={subjects} />
    </div>
  );
}
