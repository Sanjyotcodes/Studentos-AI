import { AlertTriangle, CheckCircle2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusTone = 'good' | 'warning' | 'serious' | 'critical';

// Status colors are a reserved palette — never reused as a series color.
//
// good (#0ca30c) and critical (#d03b3b) are a red/green pair measuring
// deutan ΔE 4.1: to a red-green colorblind reader they are the same color.
// That pairing is only legal with secondary encoding, so this component
// makes the icon and the text label non-optional — there is deliberately no
// prop to render a bare colored dot. Every status in the app goes through
// here precisely so that rule cannot be bypassed one component at a time.
const TONE: Record<StatusTone, { icon: LucideIcon; dot: string; text: string; wash: string }> = {
  good: {
    icon: CheckCircle2,
    dot: 'text-status-good',
    text: 'text-tint-teal-foreground',
    wash: 'bg-tint-teal',
  },
  warning: {
    icon: AlertTriangle,
    dot: 'text-status-warning',
    text: 'text-tint-amber-foreground',
    wash: 'bg-tint-amber',
  },
  serious: {
    icon: AlertTriangle,
    dot: 'text-status-serious',
    text: 'text-tint-amber-foreground',
    wash: 'bg-tint-amber',
  },
  critical: {
    icon: AlertTriangle,
    dot: 'text-status-critical',
    text: 'text-destructive',
    wash: 'bg-destructive/10',
  },
};

interface StatusBadgeProps {
  tone: StatusTone;
  /** Required: the label IS the accessible encoding, not a decoration. */
  label: string;
  className?: string;
}

export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  const { icon: Icon, dot, text, wash } = TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        wash,
        text,
        className,
      )}
    >
      {/* The icon is the shape channel; the text is the literal channel.
          Both are redundant with the color on purpose. */}
      <Icon className={cn('h-3.5 w-3.5 shrink-0', dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
