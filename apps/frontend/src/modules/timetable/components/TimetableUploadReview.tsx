'use client';

import type { ProposedTimetableSlotResult, Subject } from '@studentos/shared';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api-client';
import { useCreateSubject } from '@/modules/attendance/hooks/useCreateSubject';
import { useCreateTimetableSlot } from '@/modules/timetable/hooks/useCreateTimetableSlot';
import { useParseTimetableUpload } from '@/modules/timetable/hooks/useParseTimetableUpload';
import { dayOfWeekLabel } from '@/modules/timetable/utils/display';
import { useAttendanceSettingsStore } from '@/stores/useAttendanceSettingsStore';

type SubjectMode = 'existing' | 'new';

interface ReviewRow extends ProposedTimetableSlotResult {
  // Local-only key (proposals have no id — nothing has been persisted yet).
  key: string;
  subjectMode: SubjectMode;
  chosenSubjectId: string;
  newSubjectName: string;
  newSubjectCode: string;
  status: 'pending' | 'confirming' | 'confirmed' | 'error';
  error?: string;
}

interface TimetableUploadReviewProps {
  subjects: Subject[];
}

// e.g. "Digital Electronics" -> "DE" — just a starting point the student can
// edit; uniqueness (per-user, enforced by the backend) is checked on submit,
// not guessed here.
function deriveDefaultCode(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 20);
  return initials || 'SUBJ';
}

function toRow(slot: ProposedTimetableSlotResult, index: number): ReviewRow {
  return {
    ...slot,
    key: `${index}-${slot.subjectName}-${slot.dayOfWeek}-${slot.startTime}`,
    // No confident match -> default straight to "create a new subject" (T16's
    // original goal: uploading a timetable should be enough on its own,
    // never silently blocked on a separate manual step first). A match ->
    // default to linking the existing subject, still editable either way.
    subjectMode: slot.matchedSubjectId ? 'existing' : 'new',
    chosenSubjectId: slot.matchedSubjectId ?? '',
    newSubjectName: slot.subjectName.slice(0, 100),
    newSubjectCode: deriveDefaultCode(slot.subjectName),
    status: 'pending',
  };
}

// T16.4/T16.5: uploads a photo/PDF, shows the AI's proposed slots for
// review, and only ever persists a row once the student explicitly confirms
// it (one createTimetableSlot call per row, plus — when the row isn't linked
// to an existing subject — one createSubject call first) — never a bulk
// auto-save.
export function TimetableUploadReview({ subjects }: TimetableUploadReviewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseUpload = useParseTimetableUpload();
  const createSubject = useCreateSubject();
  const createSlot = useCreateTimetableSlot();
  const defaultCutoff = useAttendanceSettingsStore((state) => state.defaultCutoff);
  const [rows, setRows] = useState<ReviewRow[]>([]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setRows([]);
    parseUpload.mutate(file, {
      onSuccess: (result) => setRows(result.slots.map(toRow)),
    });
  };

  const updateRow = (key: string, patch: Partial<ReviewRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const confirmRow = async (row: ReviewRow) => {
    updateRow(row.key, { status: 'confirming', error: undefined });
    try {
      let subjectId = row.chosenSubjectId;
      if (row.subjectMode === 'new') {
        const subject = await createSubject.mutateAsync({
          name: row.newSubjectName,
          code: row.newSubjectCode,
          minAttendancePercent: defaultCutoff,
        });
        subjectId = subject.id;
      }
      await createSlot.mutateAsync({
        subjectId,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
      });
      updateRow(row.key, { status: 'confirmed', chosenSubjectId: subjectId });
    } catch (error) {
      updateRow(row.key, {
        status: 'error',
        error: error instanceof ApiClientError ? error.message : 'Could not save this class.',
      });
    }
  };

  const discardRow = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const canConfirm = (row: ReviewRow): boolean =>
    row.subjectMode === 'existing'
      ? Boolean(row.chosenSubjectId)
      : row.newSubjectName.trim().length > 0 && row.newSubjectCode.trim().length > 0;

  const parseError =
    parseUpload.error instanceof ApiClientError
      ? parseUpload.error.message
      : parseUpload.error
        ? 'Something went wrong reading that file. Please try again or add classes manually.'
        : null;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Upload your timetable</h2>
            <p className="text-sm text-muted-foreground">
              Upload a photo or PDF of your college timetable — review and confirm each class before
              it&apos;s added. New subjects are created automatically unless you link to one you
              already have.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={parseUpload.isPending}
          >
            <Upload className="h-4 w-4" />
            {parseUpload.isPending ? 'Reading…' : 'Upload'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {parseError && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {parseError}
          </p>
        )}

        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.key} className="space-y-2 rounded-md border border-border p-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">
                      &ldquo;{row.subjectName}&rdquo; — {dayOfWeekLabel(row.dayOfWeek)}, {row.startTime}–
                      {row.endTime}
                    </p>
                    {row.matchedSubjectId === null && row.status !== 'confirmed' && (
                      <p className="text-xs text-muted-foreground">
                        No matching subject found — a new one will be created, or link it to an
                        existing subject below.
                      </p>
                    )}
                    {row.status === 'error' && row.error && (
                      <p className="text-xs text-destructive">{row.error}</p>
                    )}
                  </div>

                  {row.status === 'confirmed' && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Added
                    </span>
                  )}
                </div>

                {row.status !== 'confirmed' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`subject-mode-${row.key}`}
                          checked={row.subjectMode === 'new'}
                          onChange={() => updateRow(row.key, { subjectMode: 'new' })}
                        />
                        Create new subject
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`subject-mode-${row.key}`}
                          checked={row.subjectMode === 'existing'}
                          onChange={() => updateRow(row.key, { subjectMode: 'existing' })}
                        />
                        Link to existing subject
                      </label>
                    </div>

                    {row.subjectMode === 'new' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          aria-label={`New subject name for ${row.subjectName}`}
                          className="h-8 w-48"
                          value={row.newSubjectName}
                          onChange={(e) => updateRow(row.key, { newSubjectName: e.target.value })}
                          placeholder="Subject name"
                        />
                        <Input
                          aria-label={`New subject code for ${row.subjectName}`}
                          className="h-8 w-24"
                          value={row.newSubjectCode}
                          onChange={(e) => updateRow(row.key, { newSubjectCode: e.target.value })}
                          placeholder="Code"
                        />
                      </div>
                    ) : (
                      <select
                        aria-label={`Existing subject for ${row.subjectName}`}
                        className="w-fit rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        value={row.chosenSubjectId}
                        onChange={(e) => updateRow(row.key, { chosenSubjectId: e.target.value })}
                      >
                        <option value="">Select a subject…</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={!canConfirm(row) || row.status === 'confirming'}
                        onClick={() => confirmRow(row)}
                      >
                        {row.status === 'confirming' ? 'Adding…' : 'Confirm'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => discardRow(row.key)}>
                        Discard
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
