'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuthStore, getPermissions } from '@/lib/stores/authStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { useThemeStore } from '@/lib/stores/themeStore';
import { applyTheme, applyFontSize } from '@/lib/utils/themes';
import { authApi } from '@/lib/api/auth';
import { cn } from '@/lib/utils/constants';

const pageVariants = {
  initial:  { opacity: 0, y: 8 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -8 },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, _hasHydrated, user, updateUser, setAuth } = useAuthStore();
  const { sidebarCollapsed, sidebarSize } = useUIStore();
  const { userThemes, fontSize, darkMode } = useThemeStore();
  const expandedMarginClass = sidebarSize === 'narrow'
    ? 'lg:ml-[220px]'
    : sidebarSize === 'wide'
      ? 'lg:ml-[300px]'
      : 'lg:ml-[260px]';

  // Apply dark mode class to <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Route-level permission guard
  const ROUTE_PERM_MAP: Record<string, (p: ReturnType<typeof getPermissions>) => boolean> = {
    '/children':   (p) => p.children.view,
    '/attendance': (p) => p.attendance.view,
    '/payments':   (p) => p.payments.view,
    '/groups':     (p) => p.groups.view,
    '/divisions':  (p) => p.groups.view,
    '/reports':    (p) => p.reports.view,
    '/schedule':   (p) => p.schedule.view,
    '/settings':   (p) => p.settings.view,
  };

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !user) return;
    const perms = getPermissions(user.role);
    const matchedKey = Object.keys(ROUTE_PERM_MAP).find((route) =>
      route === '/' ? pathname === '/' : pathname.startsWith(route)
    );
    if (matchedKey && !ROUTE_PERM_MAP[matchedKey](perms)) {
      router.replace('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, isAuthenticated, user?.role, pathname]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  // Refresh user profile in background only once per session (not on every navigation)
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;
    const SESSION_KEY = 'kg_me_fetched';
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
    authApi.me().then((me) => {
      updateUser({
        id:          me.id,
        firstName:   me.firstName,
        lastName:    me.lastName,
        email:       me.email,
        role:        me.role as import('@/types').UserRole,
        isActive:    me.isActive,
        name:        me.name,
        phoneNumber: me.phoneNumber,
      });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, isAuthenticated]);

  // Apply persisted theme + font size on mount / change
  useEffect(() => {
    if (user) {
      const themeKey = userThemes[user.id] ?? 'green';
      applyTheme(themeKey);
    }
    applyFontSize(fontSize);
  }, [user, userThemes, fontSize]);

  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white-soft dark:bg-[#0f1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white-soft dark:bg-[#0f1117] transition-colors duration-300">
      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Main area */}
      <div
        className={cn(
          'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          expandedMarginClass,
          sidebarCollapsed && 'lg:ml-[72px]'
        )}
      >
        <TopBar />

        <motion.main
          variants={pageVariants}
          initial="initial"
          animate="animate"
          className="px-4 py-5 lg:px-6 lg:py-6 page-content"
          aria-busy="false"
        >
          {children}
        </motion.main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
