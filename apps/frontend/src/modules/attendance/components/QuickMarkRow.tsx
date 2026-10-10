'use client';

import type { AttendanceStatus } from '@studentos/shared';
import { Ban, Check, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMarkAttendance } from '@/modules/attendance/hooks/useMarkAttendance';
import { todayDateOnly } from '@/modules/attendance/utils/display';
import { cn } from '@/lib/utils';

interface QuickMarkRowProps {
  subjectId: string;
  todayStatus?: AttendanceStatus;
}

const OPTIONS: Array<{
  status: AttendanceStatus;
  label: string;
  icon: typeof Check;
  activeVariant: 'selected' | 'destructive' | 'secondary';
}> = [
  { status: 'PRESENT', label: 'Present', icon: Check, activeVariant: 'selected' },
  { status: 'ABSENT', label: 'Absent', icon: X, activeVariant: 'destructive' },
  { status: 'CANCELLED', label: 'Cancelled', icon: Ban, activeVariant: 'secondary' },
  { status: 'HOLIDAY', label: 'Holiday', icon: Sun, activeVariant: 'secondary' },
];

// The fast daily-marking control (T9.14: reachable in <=2 taps from the
// dashboard — one tap into the attendance list, one tap here). Marking the
// same day twice just re-marks it (T9.4's idempotent upsert), so there's no
// special-case "already marked" guard needed. Four options as of Phase 16
// (T16.11) — Cancelled/Holiday are both excluded from the percentage the
// same way (attendance.service.ts), but are tracked as distinct statuses so
// a student can tell "professor cancelled this one lecture" apart from
// "the college was closed."
export function QuickMarkRow({ subjectId, todayStatus }: QuickMarkRowProps) {
  const markAttendance = useMarkAttendance();

  const mark = (status: AttendanceStatus) => {
    markAttendance.mutate({ subjectId, date: todayDateOnly(), status });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mark today's attendance">
      {OPTIONS.map(({ status, label, icon: Icon, activeVariant }) => {
        const isActive = todayStatus === status;
        return (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={isActive ? activeVariant : 'outline'}
            className={cn(isActive && 'pointer-events-none')}
            onClick={() => mark(status)}
            disabled={markAttendance.isPending}
            aria-pressed={isActive}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        );
      })}
    </div>
  );
}
