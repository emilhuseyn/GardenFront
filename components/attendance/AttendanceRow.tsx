'use client';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanFace, PenLine, Clock, User, LogIn, LogOut, CalendarDays, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { TimeInput } from '@/components/attendance/TimeInput';
import { cn } from '@/lib/utils/constants';

export type AttendanceStatus = 'present' | 'absent' | 'not_counted' | null;
export type RecordSource = 'manual' | 'faceid' | 'auto';

export interface AttendanceRowData {
  id: string;
  firstName: string;
  lastName: string;
  groupName: string;
  childStatus?: 'Active' | 'Inactive';
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  isEarlyLeave?: boolean;
  recordSource?: RecordSource;
  recordedByName?: string;
  date?: string; // 'yyyy-MM-dd'
}

interface AttendanceRowProps {
  row: AttendanceRowData;
  index: number;
  onChange?: (id: string, field: 'status' | 'checkIn' | 'checkOut', value: string) => void;
  onToggleEarlyLeave?: (id: string) => void;
}

const STATUS_BUTTONS: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: 'present',     label: 'Gəldi',    activeClass: 'bg-green-400 text-white border-green-400'  },
  { value: 'absent',      label: 'Gəlmədi',  activeClass: 'bg-accent-rose text-white border-rose-400' },
  { value: 'not_counted', label: 'Sayılmır', activeClass: 'bg-gray-400 text-white border-gray-400'    },
];

const AZ_MONTHS = [
  'Yanvar','Fevral','Mart','Aprel','May','İyun',
  'İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr',
];

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function StatusInfoPopover({ row, onClose }: { row: AttendanceRowData; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const statusColor = {
    present:     { bg: 'bg-green-500',  light: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-700 dark:text-green-300',  border: 'border-green-100 dark:border-green-800/40',  label: 'Gəldi'    },
    absent:      { bg: 'bg-rose-500',   light: 'bg-rose-50 dark:bg-rose-900/20',    text: 'text-rose-700 dark:text-rose-300',    border: 'border-rose-100 dark:border-rose-800/40',    label: 'Gəlmədi'  },
    not_counted: { bg: 'bg-gray-400',   light: 'bg-gray-50 dark:bg-gray-800/40',    text: 'text-gray-600 dark:text-gray-400',    border: 'border-gray-200 dark:border-gray-700/40',    label: 'Sayılmır' },
  }[row.status ?? 'absent'] ?? { bg: 'bg-gray-400', light: 'bg-gray-50 dark:bg-gray-800/40', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200', label: '—' };

  const sourceInfo = {
    faceid: { icon: <ScanFace size={12} />, label: 'Face ID (Kamera)',  cls: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40' },
    manual: { icon: <PenLine  size={12} />, label: row.recordedByName ?? 'Əllə doldurulub', cls: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700/40' },
    auto:   { icon: <Clock    size={12} />, label: 'Avtomatik (gün sonu)', cls: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40' },
  }[row.recordSource ?? 'manual'];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl shadow-xl border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] overflow-hidden"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.12))' }}
    >
      {/* Header strip */}
      <div className={cn('px-4 py-3 flex items-center justify-between', statusColor.light)}>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', statusColor.bg)} />
          <span className={cn('text-sm font-semibold', statusColor.text)}>{statusColor.label}</span>
          {row.isEarlyLeave && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              Tez çıxdı
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">

        {/* Date */}
        {row.date && (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center shrink-0">
              <CalendarDays size={12} className="text-gray-500 dark:text-gray-400" />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-300">{formatDate(row.date)}</span>
          </div>
        )}

        {/* Check-in + Check-out side by side */}
        {(row.checkIn || row.checkOut) && (
          <div className="flex items-center gap-2">
            {row.checkIn && (
              <div className="flex items-center gap-1.5 flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl px-2.5 py-2 border border-green-100 dark:border-green-800/30">
                <LogIn size={11} className="text-green-500 shrink-0" />
                <div>
                  <span className="text-[9px] text-green-600/70 dark:text-green-400/70 block leading-none">Giriş</span>
                  <span className="text-xs font-bold text-green-700 dark:text-green-300">{row.checkIn}</span>
                </div>
              </div>
            )}
            {row.checkOut && (
              <div className="flex items-center gap-1.5 flex-1 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-2.5 py-2 border border-rose-100 dark:border-rose-800/30">
                <LogOut size={11} className="text-rose-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-rose-500/70 dark:text-rose-400/70 block leading-none">Çıxış</span>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-300">{row.checkOut}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Source */}
        {row.recordSource && sourceInfo && (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center shrink-0">
              <User size={12} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block leading-none mb-0.5">Qeyd edən</span>
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border', sourceInfo.cls)}>
                {sourceInfo.icon}
                {sourceInfo.label}
              </span>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}

export function AttendanceRow({ row, index, onChange, onToggleEarlyLeave }: AttendanceRowProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      className={cn(
        'border-b border-white-border dark:border-gray-700/40 transition-colors',
        row.childStatus === 'Inactive' ? 'bg-gray-50/70 dark:bg-gray-800/20' :
        row.status === 'absent'        ? 'bg-rose-50/40 dark:bg-rose-900/10' :
        row.status === 'not_counted'   ? 'bg-gray-50/60 dark:bg-gray-800/20 opacity-70' : ''
      )}
    >
      {/* Name */}
      <td className="px-4 py-3">
        <Link href={`/children/${row.id}`} className="flex items-center gap-3 group">
          <Avatar name={`${row.firstName} ${row.lastName}`} size="sm" />
          <div>
            <p className={cn(
              'text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-primary transition-colors',
              (row.status === 'absent' || row.childStatus === 'Inactive') && 'line-through text-gray-400'
            )}>
              {row.firstName} {row.lastName}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">{row.groupName}</p>
              {row.childStatus === 'Inactive' && (
                <Badge variant="inactive" size="xs">Deaktiv</Badge>
              )}
            </div>
          </div>
        </Link>
      </td>

      {/* Status toggle buttons */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1">
            {STATUS_BUTTONS.map((btn) => (
              <button
                key={btn.value}
                onClick={() => onChange?.(row.id, 'status', row.status === btn.value ? '' : btn.value!)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-lg border transition-all',
                  row.status === btn.value
                    ? btn.activeClass
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-white-border dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {row.status === 'present' && (
            <button
              onClick={() => onToggleEarlyLeave?.(row.id)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-lg border transition-all w-fit',
                row.isEarlyLeave
                  ? 'bg-violet-500 text-white border-violet-500'
                  : 'bg-white dark:bg-gray-800 text-gray-400 border-white-border dark:border-gray-600 hover:border-violet-300 hover:text-violet-500'
              )}
            >
              Tez çıxdı
            </button>
          )}
        </div>
      </td>

      {/* Check-in */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <TimeInput
          value={row.checkIn ?? ''}
          onChange={(v) => onChange?.(row.id, 'checkIn', v)}
          disabled={row.status === 'absent' || row.status === 'not_counted' || !row.status}
        />
      </td>

      {/* Check-out */}
      <td className="px-4 py-3 hidden md:table-cell">
        <TimeInput
          value={row.checkOut ?? ''}
          onChange={(v) => onChange?.(row.id, 'checkOut', v)}
          disabled={row.status === 'absent' || row.status === 'not_counted' || !row.status}
        />
      </td>

      {/* Current status — clickable badge with popover */}
      <td className="px-4 py-3 hidden lg:table-cell">
        {row.status ? (
          <div className="relative inline-block">
            <button
              onClick={() => setPopoverOpen((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-sm hover:shadow-md active:scale-95',
                row.status === 'present'
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/50'
                  : row.status === 'absent'
                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/50'
                  : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700/60'
              )}
            >
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                row.status === 'present' ? 'bg-green-500' : row.status === 'absent' ? 'bg-rose-500' : 'bg-gray-400'
              )} />
              {row.status === 'present' ? 'Gəldi' : row.status === 'not_counted' ? 'Sayılmır' : 'Gəlmədi'}
              {row.recordSource === 'faceid' && <ScanFace size={10} className="text-blue-500 ml-0.5" />}
              {row.recordSource === 'manual' && <PenLine  size={10} className="text-gray-400 ml-0.5" />}
              {row.recordSource === 'auto'   && <Clock    size={10} className="text-amber-500 ml-0.5" />}
            </button>

            <AnimatePresence>
              {popoverOpen && (
                <StatusInfoPopover row={row} onClose={() => setPopoverOpen(false)} />
              )}
            </AnimatePresence>
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
    </motion.tr>
  );
}
