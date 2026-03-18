'use client';
import Image from 'next/image';
import { Menu, Sun, Moon } from 'lucide-react';
import { useUIStore } from '@/lib/stores/uiStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { useThemeStore } from '@/lib/stores/themeStore';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/utils/format';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { toggleMobileNav } = useUIStore();
  const { user } = useAuthStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const today = formatDate(new Date(), 'EEEE, d MMMM yyyy');

  return (
    <header className="h-16 bg-white dark:bg-[#1a1d27] border-b border-white-border dark:border-gray-700/60 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-20 transition-colors duration-300">
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobileNav}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        aria-label="Menyunu aç"
      >
        <Menu size={20} />
      </button>

      {/* Logo for mobile */}
      <div className="lg:hidden">
        <Image
          src="/KinderGardenLogo.png"
          alt="KinderGarden"
          width={136}
          height={34}
          priority
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Title (desktop only) */}
      {title && (
        <h1 className="hidden lg:block text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h1>
      )}

      {/* Date (desktop) */}
      <div className="hidden lg:block text-xs text-gray-400 dark:text-gray-500 capitalize">{today}</div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'İşıqlı rejim' : 'Qaranlıq rejim'}
          className="relative w-[52px] h-7 rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
          style={{ backgroundColor: darkMode ? '#34C47E' : '#E5E7EB' }}
        >
          <span
            className="absolute top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300"
            style={{ transform: darkMode ? 'translateX(26px)' : 'translateX(2px)' }}
          >
            {darkMode
              ? <Moon size={13} className="text-green-600" />
              : <Sun  size={13} className="text-amber-500" />
            }
          </span>
        </button>

        {/* User avatar (mobile) */}
        <div className="lg:hidden">
          <Avatar name={user?.name ?? 'User'} size="sm" />
        </div>
      </div>
    </header>
  );
}
