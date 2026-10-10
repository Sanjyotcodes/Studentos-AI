'use client';

import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { EASE_OUT } from '@/lib/motion';

interface AnimatedNumberProps {
  /**
   * The real value. Already computed by the backend — this component only
   * animates the *display* of it and never derives a number of its own.
   */
  value: number | null;
  /** Rendered as-is when `value` is null (e.g. a subject with no classes). */
  placeholder?: string;
  decimals?: number;
  suffix?: string;
  /**
   * Overrides `decimals`/`suffix` for full control of the rendered string.
   *
   * Needed wherever the backend's own precision must be preserved exactly:
   * attendance percentages arrive rounded to 2dp, so a tile that re-rounded
   * 91.67 to "92%" would contradict the AI summary printed beside it. Pass a
   * formatter that matches whatever the rest of the page uses.
   */
  format?: (value: number) => string;
  durationMs?: number;
  className?: string;
}

/**
 * Counts up to `value` when it first scrolls into view.
 *
 * Three correctness rules this has to respect, because it renders data:
 *
 * 1. It always lands exactly on `value` — the final frame is the real number,
 *    never a rounding artifact of the tween.
 * 2. `null` means "no data" and is shown as a dash. It never animates to 0,
 *    which would read as a real measurement of zero.
 * 3. Under reduced motion it renders the final value immediately. A counting
 *    animation is pure decoration on a number that is already correct.
 */
export function AnimatedNumber({
  value,
  placeholder = '—',
  decimals = 0,
  suffix = '',
  format,
  durationMs = 900,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => (prefersReducedMotion ? (value ?? 0) : 0));

  useEffect(() => {
    if (value === null) return;

    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }
    if (!isInView) return;

    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: EASE_OUT,
      onUpdate: (latest) => setDisplay(latest),
      // Guarantee rule 1 regardless of where the tween's last frame landed.
      onComplete: () => setDisplay(value),
    });
    return () => controls.stop();
  }, [value, isInView, prefersReducedMotion, durationMs]);

  const render = (n: number) => (format ? format(n) : `${n.toFixed(decimals)}${suffix}`);

  return (
    <span ref={ref} className={className}>
      {value === null ? placeholder : render(display)}
    </span>
  );
}
