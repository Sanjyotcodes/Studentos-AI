// General UI helpers (className merge, formatters).
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Combines conditional className logic (clsx) with Tailwind-aware conflict
// resolution (twMerge), so e.g. cn('p-2', condition && 'p-4') correctly
// keeps only 'p-4' rather than emitting both classes.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
