'use client';

import type { Subject } from '@studentos/shared';
import { BookOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { DeleteSubjectDialog } from '@/modules/attendance/components/DeleteSubjectDialog';
import { SubjectFormDialog } from '@/modules/attendance/components/SubjectFormDialog';
import { SubjectListItem } from '@/modules/attendance/components/SubjectListItem';
import { useAttendanceSummary } from '@/modules/attendance/hooks/useAttendanceSummary';
import { useSubjects } from '@/modules/attendance/hooks/useSubjects';
import { useTodayAttendance } from '@/modules/attendance/hooks/useTodayAttendance';
import { useTodayTimetable } from '@/modules/timetable/hooks/useTodayTimetable';
import { useAttendanceSettingsStore } from '@/stores/useAttendanceSettingsStore';

export default function AttendancePage() {
  const subjectsQuery = useSubjects();
  const summaryQuery = useAttendanceSummary();
  const todayQuery = useTodayAttendance();
  const todayTimetableQuery = useTodayTimetable();
  const defaultCutoff = useAttendanceSettingsStore((state) => state.defaultCutoff);

  const [formSubject, setFormSubject] = useState<Subject | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const openAddDialog = () => {
    setFormSubject(undefined);
    setFormOpen(true);
  };
  const openEditDialog = (subject: Subject) => {
    setFormSubject(subject);
    setFormOpen(true);
  };

  if (subjectsQuery.isLoading) {
    return <LoadingBlock label="Loading your subjects…" />;
  }
  if (subjectsQuery.isError) {
    return <ErrorState onRetry={() => subjectsQuery.refetch()} />;
  }

  const subjects = subjectsQuery.data ?? [];
  const summaryBySubjectId = new Map(
    (summaryQuery.data?.subjects ?? []).map((s) => [s.subjectId, s]),
  );
  const todayStatusBySubjectId = new Map(
    (todayQuery.data ?? []).map((r) => [r.subjectId, r.status]),
  );
  // Additive only (T16.6) — a subject not in today's timetable, or a failed/
  // still-loading fetch of it, never removes or disables its quick-mark row;
  // this set only affects which subjects surface first.
  const scheduledTodaySubjectIds = new Set(todayTimetableQuery.data?.subjectIds ?? []);

  const sortedSubjects = [...subjects].sort((a, b) => {
    const aScheduled = scheduledTodaySubjectIds.has(a.id);
    const bScheduled = scheduledTodaySubjectIds.has(b.id);
    if (aScheduled !== bScheduled) return aScheduled ? -1 : 1;
    const aAtRisk = summaryBySubjectId.get(a.id)?.status === 'AT_RISK';
    const bAtRisk = summaryBySubjectId.get(b.id)?.status === 'AT_RISK';
    if (aAtRisk !== bAtRisk) return aAtRisk ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Attendance</h1>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4" />
          Add subject
        </Button>
      </div>

      {subjects.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Add your first subject to start tracking attendance."
          action={
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              Add your first subject
            </Button>
          }
        />
      )}

      {subjects.length > 0 && summaryQuery.isError && (
        <ErrorState onRetry={() => summaryQuery.refetch()} />
      )}

      {subjects.length > 0 && !summaryQuery.isError && (
        <div className="space-y-3">
          {sortedSubjects.map((subject) => (
            <SubjectListItem
              key={subject.id}
              subject={subject}
              summary={summaryBySubjectId.get(subject.id)}
              todayStatus={todayStatusBySubjectId.get(subject.id)}
              scheduledToday={scheduledTodaySubjectIds.has(subject.id)}
              onEdit={() => openEditDialog(subject)}
              onDelete={() => setDeleteTarget(subject)}
            />
          ))}
        </div>
      )}

      <SubjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        subject={formSubject}
        defaultCutoff={defaultCutoff}
      />
      <DeleteSubjectDialog subject={deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} />
    </div>
  );
}
