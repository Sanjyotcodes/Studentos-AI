// Zustand store for the desktop sidebar's collapsed/expanded state.
//
// Deliberately in-memory only (no persist middleware/localStorage). Plain
// Zustand state already survives client-side navigation within the App
// Router — the page content swaps, but the store instance doesn't remount —
// which is all T7.2 requires. Adding localStorage persistence would risk a
// server/client hydration mismatch on the very first paint (T7.1 requires
// zero hydration warnings) for a requirement (surviving a full reload) that
// was never actually asked for here.
import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
}));
