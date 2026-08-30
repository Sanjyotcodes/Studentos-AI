'use client';

import type { AttendanceRecord, AttendanceStatus } from '@studentos/shared';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteAttendanceRecord } from '@/modules/attendance/hooks/useDeleteAttendanceRecord';
import { useUpdateAttendanceRecord } from '@/modules/attendance/hooks/useUpdateAttendanceRecord';
import { attendanceStatusLabel, formatDateLabel } from '@/modules/attendance/utils/display';
import { cn } from '@/lib/utils';

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'CANCELLED', 'HOLIDAY'];

interface AttendanceHistoryListProps {
  subjectId: string;
  records: AttendanceRecord[];
}

// T9.10: history + correcting a past record. Each row's status is a small
// button group so a correction is a single click, not a form round-trip.
export function AttendanceHistoryList({ subjectId, records }: AttendanceHistoryListProps) {
  const updateRecord = useUpdateAttendanceRecord();
  const deleteRecord = useDeleteAttendanceRecord();

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {records.map((record) => (
        <li key={record.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">{formatDateLabel(record.date)}</span>

          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-input" role="group">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={updateRecord.isPending}
                  onClick={() => updateRecord.mutate({ id: record.id, subjectId, input: { status } })}
                  aria-pressed={record.status === status}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium transition-colors',
                    record.status === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent',
                  )}
                >
                  {attendanceStatusLabel(status)}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete record for ${formatDateLabel(record.date)}`}
              disabled={deleteRecord.isPending}
              onClick={() => deleteRecord.mutate({ id: record.id, subjectId })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
