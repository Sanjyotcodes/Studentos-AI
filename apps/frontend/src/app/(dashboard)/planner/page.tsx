'use client';

import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { ApiClientError } from '@/lib/api-client';
import { ExamDateManager } from '@/modules/examDates/components/ExamDateManager';
import { PlanView } from '@/modules/planner/components/PlanView';
import { useGenerateStudyPlan } from '@/modules/planner/hooks/useGenerateStudyPlan';
import { useStudyPlan } from '@/modules/planner/hooks/useStudyPlan';

export default function PlannerPage() {
  const planQuery = useStudyPlan();
  const generatePlan = useGenerateStudyPlan();

  const noPlanYet = planQuery.error instanceof ApiClientError && planQuery.error.code === 'NO_STUDY_PLAN';

  const generateErrorMessage =
    generatePlan.error instanceof ApiClientError
      ? generatePlan.error.message
      : generatePlan.error
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Study planner</h1>

      <ExamDateManager />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Your plan</p>
        <Button onClick={() => generatePlan.mutate()} disabled={generatePlan.isPending}>
          {generatePlan.isPending
            ? 'Generating…'
            : planQuery.data
              ? 'Regenerate'
              : 'Generate plan'}
        </Button>
      </div>

      {generatePlan.isError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {generateErrorMessage}
        </p>
      )}

      {planQuery.isLoading && <LoadingBlock label="Loading your plan…" />}

      {planQuery.isError && !noPlanYet && <ErrorState onRetry={() => planQuery.refetch()} />}

      {(noPlanYet || (planQuery.data && planQuery.data.entries.length === 0)) && (
        <EmptyState
          icon={CalendarRange}
          title="No study plan yet"
          description="Add an exam date above, then generate a plan that covers every subject with an upcoming exam."
        />
      )}

      {planQuery.data && planQuery.data.entries.length > 0 && <PlanView plan={planQuery.data} />}
    </div>
  );
}
