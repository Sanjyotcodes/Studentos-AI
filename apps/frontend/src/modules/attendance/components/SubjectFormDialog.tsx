'use client';

import type { CreateSubjectInput, Subject } from '@studentos/shared';
import { createSubjectSchema } from '@studentos/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api-client';
import { useCreateSubject } from '@/modules/attendance/hooks/useCreateSubject';
import { useUpdateSubject } from '@/modules/attendance/hooks/useUpdateSubject';

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Present → editing this subject. Absent → creating a new one.
  subject?: Subject;
  defaultCutoff: number;
}

export function SubjectFormDialog({ open, onOpenChange, subject, defaultCutoff }: SubjectFormDialogProps) {
  const isEditing = Boolean(subject);
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const mutation = isEditing ? updateSubject : createSubject;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSubjectInput>({
    resolver: zodResolver(createSubjectSchema),
    defaultValues: {
      name: subject?.name ?? '',
      code: subject?.code ?? '',
      minAttendancePercent: subject?.minAttendancePercent ?? defaultCutoff,
      totalClassesRequired: subject?.totalClassesRequired ?? undefined,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: subject?.name ?? '',
        code: subject?.code ?? '',
        minAttendancePercent: subject?.minAttendancePercent ?? defaultCutoff,
        totalClassesRequired: subject?.totalClassesRequired ?? undefined,
      });
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subject]);

  const onSubmit = handleSubmit((values) => {
    if (mutation.isPending) return;
    if (isEditing && subject) {
      updateSubject.mutate(
        { id: subject.id, input: values },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createSubject.mutate(values, { onSuccess: () => onOpenChange(false) });
    }
  });

  const serverError =
    mutation.error instanceof ApiClientError
      ? mutation.error.message
      : mutation.error
        ? 'Something went wrong. Please try again.'
        : null;

  const busy = isSubmitting || mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit subject' : 'Add subject'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {serverError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="subject-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="subject-name"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'subject-name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="subject-name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="subject-code" className="text-sm font-medium">
              Code
            </label>
            <Input
              id="subject-code"
              aria-invalid={errors.code ? true : undefined}
              aria-describedby={errors.code ? 'subject-code-error' : undefined}
              {...register('code')}
            />
            {errors.code && (
              <p id="subject-code-error" className="text-sm text-destructive">
                {errors.code.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="subject-cutoff" className="text-sm font-medium">
              Minimum attendance %
            </label>
            <Input
              id="subject-cutoff"
              type="number"
              min={0}
              max={100}
              aria-invalid={errors.minAttendancePercent ? true : undefined}
              aria-describedby={errors.minAttendancePercent ? 'subject-cutoff-error' : undefined}
              {...register('minAttendancePercent', { valueAsNumber: true })}
            />
            {errors.minAttendancePercent && (
              <p id="subject-cutoff-error" className="text-sm text-destructive">
                {errors.minAttendancePercent.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="subject-total" className="text-sm font-medium">
              Total classes required (optional)
            </label>
            <Input
              id="subject-total"
              type="number"
              min={1}
              aria-invalid={errors.totalClassesRequired ? true : undefined}
              {...register('totalClassesRequired', {
                setValueAs: (value) => (value === '' ? undefined : Number(value)),
              })}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Add subject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
