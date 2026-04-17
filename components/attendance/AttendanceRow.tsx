'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ScanFace, PenLine, Clock } from 'lucide-react';
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
  scheduleStartTime?: string; // 'HH:mm'
  scheduleEndTime?: string;   // 'HH:mm'
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  isEarlyLeave?: boolean;
  recordSource?: RecordSource;
}

interface AttendanceRowProps {
  row: AttendanceRowData;
  index: number;
  onChange?: (id: string, field: 'status' | 'checkIn' | 'checkOut', value: string) => void;
  onToggleEarlyLeave?: (id: string) => void;
}

const STATUS_BUTTONS: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: 'present',     label: 'Gəldi',      activeClass: 'bg-green-400 text-white border-green-400'    },
  { value: 'absent',      label: 'Gəlmədi',    activeClass: 'bg-accent-rose text-white border-rose-400'   },
  { value: 'not_counted', label: 'Sayılmır',   activeClass: 'bg-gray-400 text-white border-gray-400'      },
];

export function AttendanceRow({ row, index, onChange, onToggleEarlyLeave }: AttendanceRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      className={cn(
        'border-b border-white-border dark:border-gray-700/40 transition-colors',
        row.childStatus === 'Inactive' ? 'bg-gray-50/70 dark:bg-gray-800/20' :
        row.status === 'absent'      ? 'bg-rose-50/40 dark:bg-rose-900/10' :
        row.status === 'not_counted' ? 'bg-gray-50/60 dark:bg-gray-800/20 opacity-70' : ''
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

      {/* Current status badge */}
      <td className="px-4 py-3 hidden lg:table-cell">
        {row.status ? (
          <div className="flex flex-col gap-1">
            <Badge variant={row.status === 'not_counted' ? 'gray' : row.status} size="sm" dot>
              {row.status === 'present' ? 'Gəldi' : row.status === 'not_counted' ? 'Sayılmır' : 'Gəlmədi'}
            </Badge>
            {row.isEarlyLeave && (
              <Badge variant="violet" size="sm">Tez çıxdı</Badge>
            )}
            {row.recordSource === 'faceid' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40 w-fit">
                <ScanFace size={10} /> FaceID
              </span>
            )}
            {row.recordSource === 'manual' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/40 w-fit">
                <PenLine size={10} /> Əllə
              </span>
            )}
            {row.recordSource === 'auto' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40 w-fit">
                <Clock size={10} /> Avto
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-300">-</span>
        )}
      </td>
    </motion.tr>
  );
}
