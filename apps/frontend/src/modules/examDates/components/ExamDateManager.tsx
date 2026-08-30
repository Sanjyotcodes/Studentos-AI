'use client';

import type { Subject } from '@studentos/shared';
import { CalendarClock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubjects } from '@/modules/attendance/hooks/useSubjects';
import { useDeleteExamDate } from '@/modules/examDates/hooks/useDeleteExamDate';
import { useExamDates } from '@/modules/examDates/hooks/useExamDates';
import { useUpsertExamDate } from '@/modules/examDates/hooks/useUpsertExamDate';

// Exam-date input: pick a subject, set its exam date (one active date per
// subject — setting a new one for a subject that already has one just
// updates it, matching the backend's upsert-by-subject design).
export function ExamDateManager() {
  const subjectsQuery = useSubjects();
  const examDatesQuery = useExamDates();
  const upsertExamDate = useUpsertExamDate();
  const deleteExamDate = useDeleteExamDate();

  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState('');

  const subjects = subjectsQuery.data ?? [];
  const examDates = examDatesQuery.data ?? [];
  const subjectById = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !date || upsertExamDate.isPending) return;
    upsertExamDate.mutate(
      { subjectId, date },
      {
        onSuccess: () => {
          setSubjectId('');
          setDate('');
        },
      },
    );
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="h-4 w-4" />
        Exam dates
      </p>

      {examDates.length > 0 && (
        <div className="space-y-1.5">
          {examDates.map((examDate) => (
            <div
              key={examDate.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>
                {subjectById.get(examDate.subjectId)?.name ?? 'Unknown subject'} — {examDate.date}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove exam date for ${subjectById.get(examDate.subjectId)?.name ?? 'subject'}`}
                disabled={deleteExamDate.isPending}
                onClick={() => deleteExamDate.mutate(examDate.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onAdd} className="flex flex-col gap-2 sm:flex-row">
        <select
          aria-label="Subject"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
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
        <Input
          aria-label="Exam date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="sm:w-44"
        />
        <Button type="submit" disabled={!subjectId || !date || upsertExamDate.isPending}>
          Set exam date
        </Button>
      </form>
    </div>
  );
}
