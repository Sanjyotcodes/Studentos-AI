'use client';

import { BookOpen, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { AttendanceProgressBar } from '@/modules/attendance/components/AttendanceProgressBar';
import { useAttendanceSummary } from '@/modules/attendance/hooks/useAttendanceSummary';
import { formatPercentage, riskStatusBadgeClass, riskStatusLabel } from '@/modules/attendance/utils/display';
import { InsightsPanel } from '@/modules/ai/components/InsightsPanel';

export default function DashboardPage() {
  const summaryQuery = useAttendanceSummary();

  if (summaryQuery.isLoading) {
    return <LoadingBlock label="Loading your overview…" />;
  }
  if (summaryQuery.isError) {
    return <ErrorState onRetry={() => summaryQuery.refetch()} />;
  }

  const summary = summaryQuery.data;
  const subjects = summary?.subjects ?? [];

  if (subjects.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Add your first subject to start tracking attendance."
          action={
            <Button asChild>
              <Link href="/attendance">
                <Plus className="h-4 w-4" />
                Add your first subject
              </Link>
            </Button>
          }
        />
        <InsightsPanel />
      </div>
    );
  }

  // At-risk subjects surfaced first, everything else after.
  const sorted = [...subjects].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'AT_RISK' ? -1 : 1;
    return a.subjectName.localeCompare(b.subjectName);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Overview</h1>

      <Card>
        <CardHeader>
          <CardTitle>Overall attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-semibold">{formatPercentage(summary?.overall.percentage ?? null)}</p>
          <AttendanceProgressBar percentage={summary?.overall.percentage ?? null} />
        </CardContent>
      </Card>

      <InsightsPanel />

      <div className="space-y-3">
        {sorted.map((s) => (
          <Link key={s.subjectId} href={`/attendance/${s.subjectId}`} className="block">
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{s.subjectName}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskStatusBadgeClass(s.status)}`}
                    >
                      {riskStatusLabel(s.status)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.status === 'AT_RISK'
                      ? `Must attend next ${s.mustAttend} to recover`
                      : `Can miss ${s.canMiss} more`}
                  </p>
                </div>
                <span className="shrink-0 text-lg font-semibold">{formatPercentage(s.percentage)}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link href="/attendance">Mark today&apos;s attendance</Link>
      </Button>
    </div>
  );
}
