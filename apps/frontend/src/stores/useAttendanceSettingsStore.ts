// The one attendance preference that has no backend home: the cutoff
// prefilled into the "add subject" form. Persisted to localStorage (unlike
// useSidebarStore) because losing it on reload would be a real regression
// for a value the user deliberately set in Settings — not just a nice-to-have.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_ATTENDANCE_CUTOFF } from '@studentos/shared';

interface AttendanceSettingsState {
  defaultCutoff: number;
  setDefaultCutoff: (value: number) => void;
}

export const useAttendanceSettingsStore = create<AttendanceSettingsState>()(
  persist(
    (set) => ({
      defaultCutoff: DEFAULT_ATTENDANCE_CUTOFF,
      setDefaultCutoff: (value) => set({ defaultCutoff: value }),
    }),
    { name: 'studentos.attendance.settings' },
  ),
);
