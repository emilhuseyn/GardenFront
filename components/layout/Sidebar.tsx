'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Baby, ClipboardCheck, CreditCard,
  GraduationCap, Building2, BarChart3, Clock, ListOrdered,
  Settings, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils/constants';
import { useUIStore } from '@/lib/stores/uiStore';
import { useAuthStore, getPermissions } from '@/lib/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { ROLE_LABELS } from '@/lib/utils/constants';

const ALL_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Ana Səhifə',  href: '/',           color: '#34C47E', permKey: null              },
  { icon: Baby,            label: 'Uşaqlar',      href: '/children',   color: '#34C47E', permKey: 'children'         },
  { icon: ClipboardCheck,  label: 'Davamiyyət',   href: '/attendance', color: '#4A90D9', permKey: 'attendance'       },
  { icon: CreditCard,      label: 'Ödənişlər',    href: '/payments',   color: '#F5A623', permKey: 'payments'         },
  { icon: ListOrdered,     label: 'Siyahılar',    href: '/lists',      color: '#0EA5A4', permKey: 'payments'         },
  { icon: GraduationCap,   label: 'Qruplar',      href: '/groups',     color: '#2EC4B6', permKey: 'groups'           },
  { icon: Building2,       label: 'Bölmələr',     href: '/divisions',  color: '#34C47E', permKey: 'groups'           },
  { icon: BarChart3,       label: 'Hesabatlar',   href: '/reports',    color: '#7C5CBF', permKey: 'reports'          },
  { icon: Clock,           label: 'Qrafik',       href: '/schedule',   color: '#34C47E', permKey: 'schedule'         },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, sidebarSize, toggleSidebar } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const perms = getPermissions(user?.role);
  const expandedWidth = sidebarSize === 'narrow' ? 220 : sidebarSize === 'wide' ? 300 : 260;

  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (!item.permKey) return true;
    const section = perms[item.permKey as keyof typeof perms] as { view?: boolean } | undefined;
    return section?.view !== false;
  });

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : expandedWidth }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex flex-col fixed left-0 top-0 h-screen z-30 bg-white dark:bg-[#1a1d27] border-r border-white-border dark:border-gray-700/60 overflow-hidden transition-colors duration-300"
    >
      {/* Logo */}
      <div className="flex flex-col items-center justify-center h-20 px-3 border-b border-white-border dark:border-gray-700/60 flex-shrink-0 relative">
        <Link href="/" className="flex items-center justify-center w-full">
          {sidebarCollapsed && (
            <Image
              src="/KinderGardenLogo.png"
              alt="KinderGarden"
              width={40}
              height={40}
              priority
              className="h-10 w-10 object-contain flex-shrink-0"
            />
          )}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center w-full"
              >
                <Image
                  src="/KinderGardenLogo.png"
                  alt="KinderGarden"
                  width={220}
                  height={48}
                  priority
                  className="h-14 w-full object-contain"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={toggleSidebar}
          className={cn(
            'absolute bottom-2 right-2 flex-shrink-0 w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors'
          )}
          aria-label={sidebarCollapsed ? 'Genişlət' : 'Daralt'}
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-200'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {/* Active indicator */}
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-green-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                size={18}
                className="flex-shrink-0 transition-colors"
                style={{ color: active ? item.color : undefined }}
              />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-2 mx-2 border-t border-gray-100 dark:border-gray-700/60" />

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
            pathname === '/settings'
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-200'
          )}
          title={sidebarCollapsed ? 'Parametrlər' : undefined}
        >
          <Settings size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Parametrlər
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </nav>

      {/* User Card */}
      <div className={cn(
        'border-t border-white-border dark:border-gray-700/60 p-3 flex-shrink-0',
        'bg-gradient-to-t from-green-50/40 dark:from-green-900/10 to-transparent'
      )}>
        {sidebarCollapsed ? (
          <div className="flex justify-center">
            <Avatar name={user?.name ?? 'User'} size="sm" />
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.name ?? 'User'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{user?.name ?? 'İstifadəçi'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</p>
            </div>
            <button
              onClick={clearAuth}
              className="flex-shrink-0 w-7 h-7 rounded-lg hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center text-gray-400 transition-colors"
              aria-label="Çıxış"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
