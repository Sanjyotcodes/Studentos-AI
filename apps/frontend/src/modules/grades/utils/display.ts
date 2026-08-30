import type { AssessmentType } from '@studentos/shared';

const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  QUIZ: 'Quiz',
  ASSIGNMENT: 'Assignment',
  MIDTERM: 'Midterm',
  FINAL: 'Final',
  LAB: 'Lab',
  OTHER: 'Other',
};

export function assessmentTypeLabel(type: AssessmentType): string {
  return ASSESSMENT_TYPE_LABELS[type];
}

// Percentage/grade-point values are already rounded once by grades.service.ts
// (T14.6) — this only decides how to render a null ("no marks yet") value,
// never re-rounds or recomputes anything (PLAN.md §4, invariant 10).
export function formatPercentage(percentage: number | null): string {
  return percentage === null ? '—' : `${percentage}%`;
}

export function formatGradePoint(gradePoint: number | null): string {
  return gradePoint === null ? '—' : gradePoint.toFixed(1);
}
