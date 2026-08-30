// Purely presentational helpers — formatting and label/color choices only.
// No percentage or prediction math lives here or anywhere in apps/frontend
// (T9.15); every number these functions touch is already computed by the
// backend's attendance.service.ts.
import type { AttendanceRiskStatus, AttendanceStatus } from '@studentos/shared';

// percentage is null when a subject has zero classes so far (T9.8) — shown
// as a neutral dash, never "NaN%" and never a misleading "0%".
export function formatPercentage(percentage: number | null): string {
  return percentage === null ? '—' : `${percentage}%`;
}

export function riskStatusLabel(status: AttendanceRiskStatus): string {
  return status === 'AT_RISK' ? 'At risk' : 'Safe';
}

export function riskStatusBadgeClass(status: AttendanceRiskStatus): string {
  return status === 'AT_RISK'
    ? 'bg-destructive/10 text-destructive'
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
}

export function attendanceStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENT':
      return 'Present';
    case 'ABSENT':
      return 'Absent';
    case 'CANCELLED':
      return 'Cancelled';
    case 'HOLIDAY':
      return 'Holiday';
  }
}

export function formatDateLabel(dateOnly: string): string {
  const date = new Date(`${dateOnly}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}
