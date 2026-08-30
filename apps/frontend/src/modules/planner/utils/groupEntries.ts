import type { StudyPlanEntry } from '@studentos/shared';

export interface PlanDayGroup {
  date: string;
  entries: StudyPlanEntry[];
}

// Groups entries by date and returns the groups in chronological order —
// the AI's entries array isn't guaranteed to already be date-sorted.
export function groupEntriesByDate(entries: StudyPlanEntry[]): PlanDayGroup[] {
  const byDate = new Map<string, StudyPlanEntry[]>();
  for (const entry of entries) {
    const bucket = byDate.get(entry.date);
    if (bucket) {
      bucket.push(entry);
    } else {
      byDate.set(entry.date, [entry]);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, dayEntries]) => ({ date, entries: dayEntries }));
}
