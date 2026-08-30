// Purely presentational helpers — no scheduling logic lives here.
import type { DayOfWeek } from '@studentos/shared';
import { DAYS_OF_WEEK } from '@studentos/shared';

const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

export function dayOfWeekLabel(day: DayOfWeek): string {
  return DAY_LABELS[day];
}

// Postgres/Prisma already return slots for a single day sorted by startTime
// (timetable.service.ts) — this is only for ordering the seven day-groups
// themselves, Mon through Sun.
export function orderedDaysOfWeek(): DayOfWeek[] {
  return [...DAYS_OF_WEEK];
}
