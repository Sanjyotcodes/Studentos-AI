'use client';

import type { CreateTimetableSlotInput, Subject, TimetableSlot } from '@studentos/shared';
import { createTimetableSlotSchema } from '@studentos/shared';
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
import { useCreateTimetableSlot } from '@/modules/timetable/hooks/useCreateTimetableSlot';
import { useUpdateTimetableSlot } from '@/modules/timetable/hooks/useUpdateTimetableSlot';
import { dayOfWeekLabel, orderedDaysOfWeek } from '@/modules/timetable/utils/display';

interface SlotFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  // Present → editing this slot. Absent → creating a new one.
  slot?: TimetableSlot;
  // Pre-fills the day when adding from a specific day's column.
  defaultDayOfWeek?: CreateTimetableSlotInput['dayOfWeek'];
}

const emptyDefaults = (
  subjects: Subject[],
  slot: TimetableSlot | undefined,
  defaultDayOfWeek: CreateTimetableSlotInput['dayOfWeek'] | undefined,
): CreateTimetableSlotInput => ({
  subjectId: slot?.subjectId ?? subjects[0]?.id ?? '',
  dayOfWeek: slot?.dayOfWeek ?? defaultDayOfWeek ?? 'MON',
  startTime: slot?.startTime ?? '09:00',
  endTime: slot?.endTime ?? '10:00',
});

export function SlotFormDialog({ open, onOpenChange, subjects, slot, defaultDayOfWeek }: SlotFormDialogProps) {
  const isEditing = Boolean(slot);
  const createSlot = useCreateTimetableSlot();
  const updateSlot = useUpdateTimetableSlot();
  const mutation = isEditing ? updateSlot : createSlot;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTimetableSlotInput>({
    resolver: zodResolver(createTimetableSlotSchema),
    defaultValues: emptyDefaults(subjects, slot, defaultDayOfWeek),
  });

  useEffect(() => {
    if (open) {
      reset(emptyDefaults(subjects, slot, defaultDayOfWeek));
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slot]);

  const onSubmit = handleSubmit((values) => {
    if (mutation.isPending) return;
    if (isEditing && slot) {
      updateSlot.mutate({ id: slot.id, input: values }, { onSuccess: () => onOpenChange(false) });
    } else {
      createSlot.mutate(values, { onSuccess: () => onOpenChange(false) });
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
          <DialogTitle>{isEditing ? 'Edit class' : 'Add class'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {serverError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="slot-subject" className="text-sm font-medium">
              Subject
            </label>
            <select
              id="slot-subject"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-invalid={errors.subjectId ? true : undefined}
              {...register('subjectId')}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {errors.subjectId && <p className="text-sm text-destructive">{errors.subjectId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="slot-day" className="text-sm font-medium">
              Day
            </label>
            <select
              id="slot-day"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              aria-invalid={errors.dayOfWeek ? true : undefined}
              {...register('dayOfWeek')}
            >
              {orderedDaysOfWeek().map((day) => (
                <option key={day} value={day}>
                  {dayOfWeekLabel(day)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="slot-start" className="text-sm font-medium">
                Start time
              </label>
              <Input
                id="slot-start"
                type="time"
                aria-invalid={errors.startTime ? true : undefined}
                {...register('startTime')}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="slot-end" className="text-sm font-medium">
                End time
              </label>
              <Input
                id="slot-end"
                type="time"
                aria-invalid={errors.endTime ? true : undefined}
                {...register('endTime')}
              />
            </div>
          </div>
          {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={busy || subjects.length === 0}>
              {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Add class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
