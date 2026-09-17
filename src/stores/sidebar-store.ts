import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  mobileOpened: boolean;
  desktopOpened: boolean;
  toggleMobile: () => void;
  toggleDesktop: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      mobileOpened: false,
      desktopOpened: true,
      toggleMobile: () =>
        set((state) => ({ mobileOpened: !state.mobileOpened })),
      toggleDesktop: () =>
        set((state) => ({ desktopOpened: !state.desktopOpened })),
      // Every sidebar link calls this, desktop included, and returning the
      // same state is what stops zustand notifying on a no-op close.
      closeMobile: () =>
        set((state) => (state.mobileOpened ? { mobileOpened: false } : state)),
    }),
    {
      name: "spcf-as-sidebar-state",
      // We only persist desktopOpened state, keep mobile menu closed by default on reload
      partialize: (state) => ({ desktopOpened: state.desktopOpened }),
    },
  ),
);
