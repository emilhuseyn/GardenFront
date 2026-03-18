'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Baby, ClipboardCheck, CreditCard,
  GraduationCap, Building2, BarChart3, Clock,
  Settings, X, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils/constants';
import { useUIStore } from '@/lib/stores/uiStore';
import { useAuthStore, getPermissions } from '@/lib/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { ROLE_LABELS } from '@/lib/utils/constants';

const ALL_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Ana Səhifə',  href: '/',           color: '#34C47E', permKey: null       },
  { icon: Baby,            label: 'Uşaqlar',      href: '/children',   color: '#34C47E', permKey: 'children' },
  { icon: ClipboardCheck,  label: 'Davamiyyət',   href: '/attendance', color: '#4A90D9', permKey: 'attendance'},
  { icon: CreditCard,      label: 'Ödənişlər',    href: '/payments',   color: '#F5A623', permKey: 'payments' },
  { icon: GraduationCap,   label: 'Qruplar',      href: '/groups',     color: '#2EC4B6', permKey: 'groups'   },
  { icon: Building2,       label: 'Bölmələr',     href: '/divisions',  color: '#34C47E', permKey: 'groups'   },
  { icon: BarChart3,       label: 'Hesabatlar',   href: '/reports',    color: '#7C5CBF', permKey: 'reports'  },
  { icon: Clock,           label: 'Qrafik',       href: '/schedule',   color: '#34C47E', permKey: 'schedule' },
  { icon: Settings,        label: 'Parametrlər',  href: '/settings',   color: '#6B7280', permKey: 'settings' },
];

const ALL_BOTTOM_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Əsas',       href: '/',           permKey: null        },
  { icon: Baby,            label: 'Uşaqlar',    href: '/children',   permKey: 'children'  },
  { icon: ClipboardCheck,  label: 'Davamiyyət', href: '/attendance', permKey: 'attendance'},
  { icon: CreditCard,      label: 'Ödəniş',     href: '/payments',   permKey: 'payments'  },
];

export function MobileNav() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const perms = getPermissions(user?.role);

  const filterByPerm = <T extends { permKey: string | null }>(items: T[]) =>
    items.filter((item) => {
      if (!item.permKey) return true;
      const section = perms[item.permKey as keyof typeof perms] as { view?: boolean } | undefined;
      return section?.view !== false;
    });

  const navItems = filterByPerm(ALL_NAV_ITEMS);
  const bottomNavItems = filterByPerm(ALL_BOTTOM_NAV_ITEMS);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1a1d27] border-t border-white-border dark:border-gray-700/60 safe-bottom transition-colors duration-300">
        <div className="flex items-center justify-around h-16">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-3 py-2 min-w-[64px]"
              >
                <Icon
                  size={22}
                  className={cn(
                    'transition-colors',
                    active ? 'text-green-400' : 'text-gray-400 dark:text-gray-500'
                  )}
                  strokeWidth={active ? 2.5 : 1.75}
                />
                <span className={cn('text-xs font-medium', active ? 'text-green-500' : 'text-gray-400 dark:text-gray-500')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 min-w-[64px]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-gray-400">
              <circle cx="12" cy="5" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" />
            </svg>
            <span className="text-xs font-medium text-gray-400">Daha çox</span>
          </button>
        </div>
      </nav>

      {/* Full screen drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed left-0 top-0 h-full w-72 z-50 bg-white dark:bg-[#1a1d27] flex flex-col transition-colors duration-300"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-white-border dark:border-gray-700/60">
                <div className="flex items-center">
                  <Image
                    src="/KinderGardenLogo.png"
                    alt="KinderGarden"
                    width={140}
                    height={36}
                    priority
                    className="h-9 w-auto object-contain"
                  />
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors',
                        active ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <Icon size={18} style={{ color: active ? item.color : undefined }} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* User */}
              <div className="border-t border-white-border p-4 bg-gradient-to-t from-green-50/40 to-transparent">
                <div className="flex items-center gap-3">
                  <Avatar name={user?.name ?? 'User'} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{user?.name ?? 'İstifadəçi'}</p>
                    <p className="text-xs text-gray-400">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</p>
                  </div>
                  <button
                    onClick={() => { clearAuth(); setMobileNavOpen(false); }}
                    className="w-8 h-8 rounded-lg hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center text-gray-400 transition-colors"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
