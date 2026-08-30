interface AttendanceProgressBarProps {
  // Already computed by the backend — this component only renders it as a
  // bar width, it never derives or adjusts the number itself.
  percentage: number | null;
  atRisk?: boolean;
}

// The one "chart" the non-goals allow: a simple progress indicator, not an
// actual chart library.
export function AttendanceProgressBar({ percentage, atRisk }: AttendanceProgressBarProps) {
  const width = percentage === null ? 0 : Math.min(100, Math.max(0, percentage));

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={percentage ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={atRisk ? 'h-full bg-destructive' : 'h-full bg-emerald-500'}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
