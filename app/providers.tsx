'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useThemeStore } from '@/lib/stores/themeStore';
import { applyDarkMode, applyFontSize, applyRadius, applyTheme } from '@/lib/utils/themes';

/**
 * Watches the logged-in user and their selected theme; re-applies CSS vars
 * whenever either changes (including on first mount after hydration).
 */
function ThemeApplier() {
  const user         = useAuthStore((s) => s.user);
  const authHydrated = useAuthStore((s) => s._hasHydrated);
  const userThemes   = useThemeStore((s) => s.userThemes);
  const themeHydrated = useThemeStore((s) => s._hasHydrated);
  const darkMode = useThemeStore((s) => s.darkMode);
  const fontSize = useThemeStore((s) => s.fontSize);
  const radius = useThemeStore((s) => s.radius);

  useEffect(() => {
    if (!authHydrated || !themeHydrated) return;
    applyTheme(user ? (userThemes[user.id] ?? 'green') : 'green');
    applyDarkMode(darkMode);
    applyFontSize(fontSize);
    applyRadius(radius);
  }, [user, authHydrated, themeHydrated, userThemes, darkMode, fontSize, radius]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes default
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      {children}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          classNames: {
            toast: 'font-sans text-sm rounded-xl shadow-lg',
          },
        }}
      />
    </QueryClientProvider>
  );
}
