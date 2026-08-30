'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingBlock } from '@/components/shared/LoadingBlock';
import { ErrorState } from '@/components/shared/ErrorState';
import { toast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/modules/auth/hooks/useCurrentUser';
import { useSubjects } from '@/modules/attendance/hooks/useSubjects';
import { useUpdateSubject } from '@/modules/attendance/hooks/useUpdateSubject';
import { useAttendanceSettingsStore } from '@/stores/useAttendanceSettingsStore';

export default function SettingsPage() {
  const userQuery = useCurrentUser();
  const subjectsQuery = useSubjects();
  const updateSubject = useUpdateSubject();
  const { defaultCutoff, setDefaultCutoff } = useAttendanceSettingsStore();

  const [cutoffInput, setCutoffInput] = useState(String(defaultCutoff));
  const [applying, setApplying] = useState(false);

  const parsedCutoff = Number(cutoffInput);
  const isValidCutoff = Number.isInteger(parsedCutoff) && parsedCutoff >= 0 && parsedCutoff <= 100;

  const saveDefault = () => {
    if (!isValidCutoff) return;
    setDefaultCutoff(parsedCutoff);
    toast({ description: 'Default cutoff saved. New subjects will use this value.' });
  };

  // T9.11: applies the new cutoff to every existing subject too, via the
  // same PATCH /subjects/:id the edit-subject dialog uses — the backend
  // recomputes every dependent number (percentage/canMiss/mustAttend) from
  // there, nothing is guessed on the client.
  const applyToAllSubjects = async () => {
    if (!isValidCutoff || !subjectsQuery.data) return;
    setApplying(true);
    try {
      await Promise.all(
        subjectsQuery.data.map((subject) =>
          updateSubject.mutateAsync({ id: subject.id, input: { minAttendancePercent: parsedCutoff } }),
        ),
      );
      setDefaultCutoff(parsedCutoff);
      toast({ description: 'Updated the cutoff for every subject.' });
    } catch {
      toast({ description: 'Some subjects failed to update. Please try again.', variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account basics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {userQuery.isLoading && <LoadingBlock label="Loading profile…" />}
          {userQuery.isError && <ErrorState onRetry={() => userQuery.refetch()} />}
          {userQuery.data && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{userQuery.data.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{userQuery.data.email}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance cutoff</CardTitle>
          <CardDescription>
            The minimum attendance percentage used when adding a new subject.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="default-cutoff" className="text-sm font-medium">
              Default cutoff %
            </label>
            <Input
              id="default-cutoff"
              type="number"
              min={0}
              max={100}
              value={cutoffInput}
              onChange={(e) => setCutoffInput(e.target.value)}
              aria-invalid={!isValidCutoff}
            />
            {!isValidCutoff && (
              <p className="text-sm text-destructive">Enter a whole number between 0 and 100.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveDefault} disabled={!isValidCutoff}>
              Save default
            </Button>
            <Button
              variant="outline"
              onClick={applyToAllSubjects}
              disabled={!isValidCutoff || applying || !subjectsQuery.data?.length}
            >
              {applying ? 'Applying…' : 'Apply to all subjects'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
