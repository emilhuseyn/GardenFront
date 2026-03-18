'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/constants';
import { attendanceApi } from '@/lib/api/attendance';
import { format } from 'date-fns';
import type { DailyAttendance } from '@/types';

const statusLabels = { present: 'Gəldi', absent: 'Gəlmədi' };

export function TodayAttendance() {
  const [data, setData] = useState<DailyAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    attendanceApi.getDaily(today)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-xl h-full overflow-hidden"
      style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0/0.06)' }}>
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700/60">
        <CardTitle className="font-display">Bu Günün Davamiyyəti</CardTitle>
        <Link href="/attendance" className="text-xs text-green-500 hover:text-green-600 font-medium transition-colors">
          Hamısı →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 dark:bg-gray-800/40">
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-2.5">Ad</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-2.5">Gəlmə</th>
              <th className="text-right text-xs font-medium text-gray-400 px-5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-5 py-3 flex justify-end"><Skeleton className="h-4 w-16" /></td>
                </tr>
              ))
            ) : (data?.entries ?? []).slice(0, 8).map((entry, i) => (
              <motion.tr
                key={entry.childId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'table-row-hover',
                  !entry.isPresent && 'opacity-60',
                  entry.isPresent && 'bg-green-50/30 dark:bg-green-900/10',
                )}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={entry.childFullName ?? '?'} size="xs" />
                    <span className={cn('font-medium text-gray-800 dark:text-gray-100', !entry.isPresent && 'line-through text-gray-400')}>
                      {entry.childFullName}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono-nums text-gray-600 dark:text-gray-400">
                  {entry.arrivalTime || '-'}
                </td>
                <td className="px-5 py-3 text-right">
                  <Badge variant={entry.isPresent ? 'present' : 'absent'} size="pill" dot>
                    {entry.isPresent ? statusLabels.present : statusLabels.absent}
                  </Badge>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
