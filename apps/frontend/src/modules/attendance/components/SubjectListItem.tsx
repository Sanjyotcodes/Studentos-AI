'use client';

import type { AttendanceStatus, Subject, SubjectAttendanceSummary } from '@studentos/shared';
import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QuickMarkRow } from '@/modules/attendance/components/QuickMarkRow';
import { StatusBadge } from '@/components/viz/StatusBadge';
import { formatPercentage, riskStatusLabel } from '@/modules/attendance/utils/display';

interface SubjectListItemProps {
  subject: Subject;
  summary?: SubjectAttendanceSummary;
  todayStatus?: AttendanceStatus;
  scheduledToday?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function SubjectListItem({
  subject,
  summary,
  todayStatus,
  scheduledToday,
  onEdit,
  onDelete,
}: SubjectListItemProps) {
  // A subject can exist with no summary entry yet only in the instant right
  // after creation, before the summary refetch lands — treat it the same as
  // "zero classes" (T9.8) rather than blocking the row on a second spinner.
  const hasClasses = (summary?.total ?? 0) > 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/attendance/${subject.id}`} className="truncate font-medium hover:underline">
              {subject.name}
            </Link>
            <span className="text-sm text-muted-foreground">{subject.code}</span>
            {scheduledToday && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Scheduled today
              </span>
            )}
            {summary && (
              <StatusBadge
                tone={summary.status === 'AT_RISK' ? 'critical' : 'good'}
                label={riskStatusLabel(summary.status)}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatPercentage(summary?.percentage ?? null)}
            </span>
            <span>cutoff {subject.minAttendancePercent}%</span>
            {!hasClasses && <span>No classes marked yet</span>}
            {hasClasses && summary && summary.status === 'AT_RISK' && (
              <span>Must attend next {summary.mustAttend} to recover</span>
            )}
            {hasClasses && summary && summary.status === 'SAFE' && (
              <span>Can miss {summary.canMiss} more</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <QuickMarkRow subjectId={subject.id} todayStatus={todayStatus} />
          <Button variant="ghost" size="icon" aria-label={`Edit ${subject.name}`} onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${subject.name}`} onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
