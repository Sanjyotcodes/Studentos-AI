import type { GradesSummary } from '@studentos/shared';
import { formatGradePoint, formatPercentage } from '@/modules/grades/utils/display';

// T14.7: per-subject weighted percentage + grade point, and the overall GPA
// — rendered exactly as returned by GET /api/grades/summary, no client-side
// recomputation (PLAN.md §4, invariant 10).
export function GradesSummaryView({ summary }: { summary: GradesSummary }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <span className="text-sm font-medium">Overall GPA</span>
        <span className="text-2xl font-semibold">{summary.gpa.toFixed(2)}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Subject</th>
              <th className="px-3 py-2 font-medium">Weight recorded</th>
              <th className="px-3 py-2 font-medium">Percentage</th>
              <th className="px-3 py-2 font-medium">Grade point</th>
            </tr>
          </thead>
          <tbody>
            {summary.subjects.map((subject) => (
              <tr key={subject.subjectId} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  {subject.subjectName} <span className="text-muted-foreground">({subject.subjectCode})</span>
                </td>
                <td className="px-3 py-2 tabular">{subject.totalWeightRecorded}</td>
                <td className="px-3 py-2 tabular">{formatPercentage(subject.weightedPercentage)}</td>
                <td className="px-3 py-2 tabular">{formatGradePoint(subject.gradePoint)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
