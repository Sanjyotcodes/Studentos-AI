// Centralised query keys so every hook and every cache read/write/invalidate
// in this module agrees on the same shape.
export const timetableSlotsQueryKey = ['timetable', 'slots'] as const;

export const timetableTodayQueryKey = (dateOnly: string) => ['timetable', 'today', dateOnly] as const;
