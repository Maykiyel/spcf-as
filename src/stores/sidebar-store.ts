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
      closeMobile: () => set({ mobileOpened: false }),
    }),
    {
      name: "spcf-as-sidebar-state",
      // We only persist desktopOpened state, keep mobile menu closed by default on reload
      partialize: (state) => ({ desktopOpened: state.desktopOpened }),
    },
  ),
);
