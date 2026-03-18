import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeKey } from '@/lib/utils/themes';

export type FontSize = 'sm' | 'md' | 'lg';
export type CurrencyFormat = 'symbol' | 'code';
export type RadiusPreset = 'sharp' | 'soft' | 'round';

interface ThemeStore {
  /** Maps userId → chosen ThemeKey */
  userThemes: Record<string, ThemeKey>;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setTheme: (userId: string, theme: ThemeKey) => void;
  getTheme: (userId: string) => ThemeKey;

  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;

  currencyFormat: CurrencyFormat;
  setCurrencyFormat: (fmt: CurrencyFormat) => void;

  radius: RadiusPreset;
  setRadius: (preset: RadiusPreset) => void;

  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      userThemes: {},
      _hasHydrated: false,
      fontSize: 'md',
      currencyFormat: 'symbol',
      radius: 'soft',
      darkMode: false,

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      setTheme: (userId, theme) =>
        set((s) => ({ userThemes: { ...s.userThemes, [userId]: theme } })),

      getTheme: (userId) => get().userThemes[userId] ?? 'green',

      setFontSize: (size) => set({ fontSize: size }),
      setCurrencyFormat: (fmt) => set({ currencyFormat: fmt }),
      setRadius: (preset) => set({ radius: preset }),

      setDarkMode: (dark) => set({ darkMode: dark }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
    }),
    {
      name: 'kg-themes',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
