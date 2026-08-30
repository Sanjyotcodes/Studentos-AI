'use client';

import { ASSESSMENT_TYPES } from '@studentos/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api-client';
import { useSubjects } from '@/modules/attendance/hooks/useSubjects';
import { useCreateMark } from '@/modules/grades/hooks/useCreateMark';
import { assessmentTypeLabel } from '@/modules/grades/utils/display';

// T14.1/T14.2: creates a mark in one form submission; the backend rejects
// scored > max or non-positive scored/max/weight with 400, surfaced here as
// a plain inline error rather than a silent failure.
export function AddMarkForm() {
  const subjectsQuery = useSubjects();
  const createMark = useCreateMark();

  const [subjectId, setSubjectId] = useState('');
  const [assessmentType, setAssessmentType] = useState<(typeof ASSESSMENT_TYPES)[number]>('QUIZ');
  const [label, setLabel] = useState('');
  const [scored, setScored] = useState('');
  const [max, setMax] = useState('');
  const [weight, setWeight] = useState('');

  const subjects = subjectsQuery.data ?? [];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || scored === '' || max === '' || weight === '' || createMark.isPending) return;
    createMark.mutate(
      {
        subjectId,
        assessmentType,
        label: label.trim() || undefined,
        scored: Number(scored),
        max: Number(max),
        weight: Number(weight),
      },
      {
        onSuccess: () => {
          setLabel('');
          setScored('');
          setMax('');
          setWeight('');
        },
      },
    );
  };

  const errorMessage =
    createMark.error instanceof ApiClientError
      ? createMark.error.message
      : createMark.error
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-lg border border-border p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <select
          aria-label="Subject"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm lg:col-span-2"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
        >
          <option value="">Select a subject…</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Assessment type"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={assessmentType}
          onChange={(e) => setAssessmentType(e.target.value as (typeof ASSESSMENT_TYPES)[number])}
        >
          {ASSESSMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {assessmentTypeLabel(type)}
            </option>
          ))}
        </select>
        <Input
          aria-label="Label (optional)"
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Input
          aria-label="Scored"
          type="number"
          placeholder="Scored"
          value={scored}
          onChange={(e) => setScored(e.target.value)}
        />
        <Input
          aria-label="Max"
          type="number"
          placeholder="Max"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Weight"
          type="number"
          placeholder="Weight (%)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="max-w-[10rem]"
        />
        <Button
          type="submit"
          disabled={!subjectId || scored === '' || max === '' || weight === '' || createMark.isPending}
        >
          <Plus className="h-4 w-4" />
          Add mark
        </Button>
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
