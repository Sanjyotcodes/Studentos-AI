'use client';

import type { Subject, TimetableSlot } from '@studentos/shared';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { SlotFormDialog } from '@/modules/timetable/components/SlotFormDialog';
import { useDeleteTimetableSlot } from '@/modules/timetable/hooks/useDeleteTimetableSlot';
import { dayOfWeekLabel, orderedDaysOfWeek } from '@/modules/timetable/utils/display';

interface TimetableWeekGridProps {
  slots: TimetableSlot[];
  subjects: Subject[];
}

export function TimetableWeekGrid({ slots, subjects }: TimetableWeekGridProps) {
  const deleteSlot = useDeleteTimetableSlot();
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  const [editingSlot, setEditingSlot] = useState<TimetableSlot | undefined>(undefined);
  const [addingForDay, setAddingForDay] = useState<TimetableSlot['dayOfWeek'] | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const openAddDialog = (day: TimetableSlot['dayOfWeek']) => {
    setEditingSlot(undefined);
    setAddingForDay(day);
    setFormOpen(true);
  };
  const openEditDialog = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setAddingForDay(undefined);
    setFormOpen(true);
  };

  if (subjects.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Add a subject first"
        description="You need at least one subject before you can add it to your timetable."
      />
    );
  }

  return (
    <div className="space-y-3">
      {orderedDaysOfWeek().map((day) => {
        const daySlots = slots.filter((s) => s.dayOfWeek === day);
        return (
          <Card key={day}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{dayOfWeekLabel(day)}</h2>
                <Button variant="ghost" size="sm" onClick={() => openAddDialog(day)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add class
                </Button>
              </div>

              {daySlots.length === 0 && (
                <p className="text-sm text-muted-foreground">No classes scheduled.</p>
              )}

              {daySlots.length > 0 && (
                <div className="space-y-1.5">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">
                          {subjectById.get(slot.subjectId)?.name ?? 'Unknown subject'}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          {slot.startTime}–{slot.endTime}
                        </span>
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit class"
                          onClick={() => openEditDialog(slot)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete class"
                          disabled={deleteSlot.isPending}
                          onClick={() => deleteSlot.mutate(slot.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <SlotFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        subjects={subjects}
        slot={editingSlot}
        defaultDayOfWeek={addingForDay}
      />
    </div>
  );
}
