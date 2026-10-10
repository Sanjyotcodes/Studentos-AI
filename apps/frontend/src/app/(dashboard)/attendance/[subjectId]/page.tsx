'use client';

import { CalendarX2, Pencil } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { AttendanceHistoryList } from '@/modules/attendance/components/AttendanceHistoryList';
import { Meter } from '@/components/viz/Meter';
import { QuickMarkRow } from '@/modules/attendance/components/QuickMarkRow';
import { StatusBadge } from '@/components/viz/StatusBadge';
import { SubjectFormDialog } from '@/modules/attendance/components/SubjectFormDialog';
import { useAttendanceRecords } from '@/modules/attendance/hooks/useAttendanceRecords';
import { useAttendanceSummary } from '@/modules/attendance/hooks/useAttendanceSummary';
import { useSubjects } from '@/modules/attendance/hooks/useSubjects';
import { useTodayAttendance } from '@/modules/attendance/hooks/useTodayAttendance';
import { formatPercentage, riskStatusLabel } from '@/modules/attendance/utils/display';
import { useAttendanceSettingsStore } from '@/stores/useAttendanceSettingsStore';

export default function SubjectAttendancePage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const defaultCutoff = useAttendanceSettingsStore((state) => state.defaultCutoff);

  const subjectsQuery = useSubjects();
  const summaryQuery = useAttendanceSummary(subjectId);
  const recordsQuery = useAttendanceRecords(subjectId);
  const todayQuery = useTodayAttendance();

  if (subjectsQuery.isLoading || summaryQuery.isLoading || recordsQuery.isLoading) {
    return <LoadingBlock label="Loading subject…" />;
  }
  if (subjectsQuery.isError) {
    return <ErrorState onRetry={() => subjectsQuery.refetch()} />;
  }
  if (summaryQuery.isError) {
    return <ErrorState onRetry={() => summaryQuery.refetch()} />;
  }
  if (recordsQuery.isError) {
    return <ErrorState onRetry={() => recordsQuery.refetch()} />;
  }

  const subject = subjectsQuery.data?.find((s) => s.id === subjectId);
  if (!subject) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="Subject not found"
        description="It may have been deleted."
      />
    );
  }

  const summary = summaryQuery.data?.subjects[0];
  const records = recordsQuery.data ?? [];
  const todayStatus = todayQuery.data?.find((r) => r.subjectId === subjectId)?.status;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{subject.name}</h1>
          <p className="text-sm text-muted-foreground">{subject.code}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {formatPercentage(summary?.percentage ?? null)}
            {summary && (
              <StatusBadge
                tone={summary.status === 'AT_RISK' ? 'critical' : 'good'}
                label={riskStatusLabel(summary.status)}
              />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Meter
            percentage={summary?.percentage ?? null}
            tone={summary?.status === 'AT_RISK' ? 'critical' : 'good'}
            cutoff={subject.minAttendancePercent}
            label={`${subject.name} attendance`}
          />
          <p className="text-sm text-muted-foreground">
            Cutoff {subject.minAttendancePercent}%
            {summary && summary.total > 0 && (
              <>
                {' · '}
                {summary.status === 'AT_RISK'
                  ? `Must attend next ${summary.mustAttend} to recover`
                  : `Can miss ${summary.canMiss} more`}
              </>
            )}
            {summary && summary.total === 0 && <> · No classes marked yet</>}
          </p>
          <div>
            <p className="mb-2 text-sm font-medium">Mark today</p>
            <QuickMarkRow subjectId={subjectId} todayStatus={todayStatus} />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium">History</h2>
        {records.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="No attendance marked yet"
            description="Mark today's attendance above to start building history."
          />
        ) : (
          <AttendanceHistoryList subjectId={subjectId} records={records} />
        )}
      </div>

      <SubjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        subject={subject}
        defaultCutoff={defaultCutoff}
      />
    </div>
  );
}
