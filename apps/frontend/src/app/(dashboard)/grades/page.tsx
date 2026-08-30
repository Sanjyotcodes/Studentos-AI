'use client';

import { GraduationCap } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { AddMarkForm } from '@/modules/grades/components/AddMarkForm';
import { GradesSummaryView } from '@/modules/grades/components/GradesSummaryView';
import { MarksList } from '@/modules/grades/components/MarksList';
import { useGradesSummary } from '@/modules/grades/hooks/useGradesSummary';
import { useMarks } from '@/modules/grades/hooks/useMarks';

export default function GradesPage() {
  const summaryQuery = useGradesSummary();
  const marksQuery = useMarks();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Grades</h1>

      <AddMarkForm />

      {(summaryQuery.isLoading || marksQuery.isLoading) && <LoadingBlock label="Loading your grades…" />}

      {summaryQuery.isError && <ErrorState onRetry={() => summaryQuery.refetch()} />}
      {!summaryQuery.isError && marksQuery.isError && <ErrorState onRetry={() => marksQuery.refetch()} />}

      {summaryQuery.data && summaryQuery.data.subjects.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="No subjects yet"
          description="Add a subject on the Attendance page, then record marks here to see your grades."
        />
      )}

      {summaryQuery.data && summaryQuery.data.subjects.length > 0 && (
        <GradesSummaryView summary={summaryQuery.data} />
      )}

      {marksQuery.data && marksQuery.data.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">All marks</p>
          <MarksList marks={marksQuery.data} />
        </div>
      )}
    </div>
  );
}
