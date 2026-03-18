import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SidebarSizePreset = 'narrow' | 'normal' | 'wide';

interface UIStore {
  sidebarCollapsed: boolean;
  sidebarSize: SidebarSizePreset;
  mobileNavOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setSidebarSize: (size: SidebarSizePreset) => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarSize: 'normal',
      mobileNavOpen: false,

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarSize: (size) => set({ sidebarSize: size }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
    }),
    {
      name: 'kg-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarSize: state.sidebarSize,
      }),
    }
  )
);
