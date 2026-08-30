'use client';

import type { Mark } from '@studentos/shared';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubjects } from '@/modules/attendance/hooks/useSubjects';
import { useDeleteMark } from '@/modules/grades/hooks/useDeleteMark';
import { assessmentTypeLabel } from '@/modules/grades/utils/display';

export function MarksList({ marks }: { marks: Mark[] }) {
  const subjectsQuery = useSubjects();
  const deleteMark = useDeleteMark();
  const subjectById = new Map((subjectsQuery.data ?? []).map((s) => [s.id, s]));

  return (
    <div className="space-y-1.5">
      {marks.map((mark) => (
        <div
          key={mark.id}
          className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
        >
          <span className="min-w-0 truncate">
            <span className="font-medium">{subjectById.get(mark.subjectId)?.name ?? 'Unknown subject'}</span>
            {' — '}
            {assessmentTypeLabel(mark.assessmentType)}
            {mark.label ? ` (${mark.label})` : ''}
            {' — '}
            {mark.scored}/{mark.max} @ {mark.weight}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete mark: ${assessmentTypeLabel(mark.assessmentType)}`}
            disabled={deleteMark.isPending}
            onClick={() => deleteMark.mutate(mark.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
