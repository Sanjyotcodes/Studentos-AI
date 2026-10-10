'use client';

import type { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { GlowCard } from '@/components/visual/GlowCard';
import { cn } from '@/lib/utils';

interface StatTileProps {
  /** Sentence case, no trailing colon (stat-tile contract). */
  label: string;
  value: number | null;
  suffix?: string;
  decimals?: number;
  /** Short supporting line under the value — context, not a second metric. */
  hint?: string;
  icon?: LucideIcon;
  /**
   * Accent for the icon chip only. The value itself always wears a text
   * token: a number is text, and text never wears the data color.
   */
  accent?: string;
  className?: string;
}

/**
 * One headline number. A handful of these form the dashboard's KPI row —
 * which is the right form for a few scalar values, rather than a grouped bar
 * chart of one bar each.
 */
export function StatTile({
  label,
  value,
  suffix = '',
  decimals = 0,
  hint,
  icon: Icon,
  accent = 'hsl(var(--brand-coral))',
  className,
}: StatTileProps) {
  return (
    <GlowCard className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </div>

      <p className="mt-2 text-2xl font-semibold text-foreground">
        <AnimatedNumber value={value} suffix={suffix} decimals={decimals} />
      </p>

      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </GlowCard>
  );
}
