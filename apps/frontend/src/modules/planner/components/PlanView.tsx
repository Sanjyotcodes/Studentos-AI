import type { StudyPlan } from '@studentos/shared';
import { groupEntriesByDate } from '@/modules/planner/utils/groupEntries';

// T13.6: renders every subject-with-an-exam's sessions, grouped by day, in
// chronological order — the caller (the planner page) is responsible for
// loading/error/empty states around this.
export function PlanView({ plan }: { plan: StudyPlan }) {
  const groups = groupEntriesByDate(plan.entries);

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.date} className="rounded-lg border border-border p-4">
          <p className="mb-2 text-sm font-semibold">{group.date}</p>
          <div className="space-y-2">
            {group.entries.map((entry, index) => (
              <div key={`${entry.subjectId}-${index}`} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
                  {entry.subjectName}
                </span>
                <span className="text-muted-foreground">{entry.activity}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
