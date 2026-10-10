'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from '@/lib/motion';
import { cn } from '@/lib/utils';

export type MeterTone = 'good' | 'critical' | 'brand';

// The fill carries severity; the track is a light step of that same ramp, so
// the bar's state reads across its whole width rather than only in the filled
// part. `color-mix` does the "lighter step" without inventing a second token
// per tone — the neutral track is declared first as the fallback for any
// engine without color-mix support.
const TONE_FILL: Record<MeterTone, string> = {
  good: 'var(--status-good)',
  critical: 'var(--status-critical)',
  brand: 'hsl(var(--brand-coral))',
};

interface MeterProps {
  /**
   * Already computed by the backend. This component renders it as a width and
   * never derives or adjusts the number (the frontend-never-recomputes
   * invariant in attendance.service.ts).
   */
  percentage: number | null;
  tone?: MeterTone;
  /**
   * Optional limit to mark on the track (e.g. the 75% attendance cutoff).
   * Drawn as a hairline tick, which is what makes this a *meter* — a ratio
   * against a limit — rather than a decorative progress bar.
   */
  cutoff?: number | null;
  /** Accessible description, e.g. "Data Structures attendance". */
  label: string;
  className?: string;
  height?: 'sm' | 'md';
}

export function Meter({
  percentage,
  tone = 'brand',
  cutoff = null,
  label,
  className,
  height = 'md',
}: MeterProps) {
  const prefersReducedMotion = useReducedMotion();
  const pct = percentage === null ? 0 : Math.min(100, Math.max(0, percentage));
  const fill = TONE_FILL[tone];

  return (
    <div
      className={cn('relative w-full', height === 'sm' ? 'h-1.5' : 'h-2.5', className)}
      role="progressbar"
      aria-label={
        cutoff === null ? label : `${label} — cutoff ${cutoff}%`
      }
      aria-valuenow={percentage ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={percentage === null ? 'No classes recorded yet' : `${percentage}%`}
    >
      {/* Track */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full bg-viz-track"
        style={{ background: `color-mix(in srgb, ${fill} 16%, hsl(var(--viz-track)))` }}
      >
        {/* Fill — square at the baseline (left), 4px rounded at the data end. */}
        <motion.div
          className="h-full rounded-r-[4px]"
          style={{ background: fill }}
          initial={{ width: prefersReducedMotion ? `${pct}%` : 0 }}
          animate={{ width: `${pct}%` }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { duration: 0.95, ease: EASE_OUT, delay: 0.15 }
          }
        />
      </div>

      {/* Cutoff tick — a hairline in the surface color, so it reads as a notch
          cut out of the bar rather than as extra data ink. */}
      {cutoff !== null && cutoff > 0 && cutoff < 100 && (
        <div
          className="absolute inset-y-[-2px] w-[2px] rounded-full bg-card"
          style={{ left: `calc(${cutoff}% - 1px)` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
