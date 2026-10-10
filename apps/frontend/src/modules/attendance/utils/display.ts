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

// riskStatusBadgeClass was removed: status is now rendered only by
// <StatusBadge>, which forces the icon + label pairing that a red/green
// status pair requires. A loose "give me the classes" helper made it easy to
// render a bare colored pill and quietly lose that guarantee.

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
