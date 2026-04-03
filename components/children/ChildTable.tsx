'use client';
import Link from 'next/link';
import { useState } from 'react';
import { MoreHorizontal, Eye, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getAge, isEnglishDivisionName } from '@/lib/utils/format';
import { SCHEDULE_LABELS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/constants';
import type { Child } from '@/types';

interface ChildTableProps {
  rows: Child[];
  onToggleStatus?: (id: number, current: string) => Promise<void> | void;
  onDelete?: (id: number) => void;
  onDeleteBulk?: (ids: number[]) => void;
}

export function ChildTable({ rows: childList, onToggleStatus, onDelete, onDeleteBulk }: ChildTableProps) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === childList.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(childList.map((c) => c.id)));
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-xl overflow-hidden"
      style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0/0.06)' }}>
      {/* Bulk action bar */}
      {selected.size > 0 && (() => {
        const selectedChildren = childList.filter(c => selected.has(c.id));
        const hasInactive = selectedChildren.some(c => c.status !== 'Active');
        const hasActive   = selectedChildren.some(c => c.status === 'Active');
        const allInactive = selectedChildren.every(c => c.status !== 'Active');
        return (
          <div className="bg-green-50 z-20 sticky top-0 border-b border-green-200 px-5 py-2.5 flex items-center gap-4">
            <span className="text-sm text-green-700 font-medium">{selected.size} uşaq seçildi</span>
            {hasInactive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-700 font-medium"
                onClick={async () => {
                  const targets = selectedChildren.filter(c => c.status !== 'Active');
                  for (const child of targets) {
                    await onToggleStatus?.(child.id, child.status);
                  }
                  setSelected(new Set());
                }}
              >
                Aktiv et
              </Button>
            )}
            {hasActive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-500 hover:text-rose-600 font-medium"
                onClick={async () => {
                  const targets = selectedChildren.filter(c => c.status === 'Active');
                  for (const child of targets) {
                    await onToggleStatus?.(child.id, child.status);
                  }
                  setSelected(new Set());
                }}
              >
                Deaktiv et
              </Button>
            )}
            {allInactive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-500 hover:text-rose-600 font-medium"
                onClick={() => {
                  onDeleteBulk?.(selectedChildren.map(c => c.id));
                  setSelected(new Set());
                }}
              >
                <Trash2 size={14} /> Sil
              </Button>
            )}
          </div>
        );
      })()}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/40">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === childList.length && childList.length > 0}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-green-400 focus:ring-green-400 cursor-pointer"
                  aria-label="Hamısını seç"
                />
              </th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Ad Soyad</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 whitespace-nowrap hidden md:table-cell">Yaş</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 whitespace-nowrap hidden lg:table-cell">Bölmə</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 whitespace-nowrap hidden lg:table-cell">Qrup</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 whitespace-nowrap hidden xl:table-cell">Qrafik</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 whitespace-nowrap hidden xl:table-cell">Aylıq</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 whitespace-nowrap hidden lg:table-cell">Ödəniş Günü</th>
              <th className="text-left font-medium text-gray-500 px-4 py-3 whitespace-nowrap">Status</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {childList.map((child) => {
              const fullName = `${child.firstName} ${child.lastName}`;
              const isEnglish = isEnglishDivisionName(child.divisionName);
              return (
              <tr
                key={child.id}
                className={cn(
                  'table-row-hover',
                  selected.has(child.id) && 'bg-green-50/50 dark:bg-green-900/20',
                  child.status === 'Inactive' && 'opacity-60'
                )}
              >
                <td className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={selected.has(child.id)}
                    onChange={() => toggleSelect(child.id)}
                    className="rounded border-gray-300 text-green-400 focus:ring-green-400 cursor-pointer"
                    aria-label={`${fullName} seç`}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <Link href={`/children/${child.id}`} className="flex items-center gap-3 hover:text-green-600 transition-colors">
                    <Avatar name={fullName} size="sm" />
                    <span className="font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">{fullName}</span>
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 hidden md:table-cell font-mono-nums">
                  {getAge(child.dateOfBirth)}
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <Badge variant={isEnglish ? 'green' : 'blue'} size="sm">
                    {isEnglish ? '🇬🇧' : '🇷🇺'} {child.divisionName}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                  {child.groupName}
                </td>
                <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs hidden xl:table-cell">
                  {SCHEDULE_LABELS[child.scheduleType]}
                </td>
                <td className="px-4 py-3.5 font-mono-nums text-gray-700 dark:text-gray-300 hidden xl:table-cell">
                  ₼{child.monthlyFee}
                </td>
                <td className="px-4 py-3.5 font-mono-nums text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                  {child.paymentDay}-i
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant={child.status === 'Active' ? 'active' : 'inactive'} size="pill" dot>
                    {child.status === 'Active' ? 'Aktiv' : 'Passiv'}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === child.id ? null : child.id)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 transition-colors"
                    aria-label="Əməliyyatlar"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {openMenu === child.id && (
                    <div className="absolute right-4 top-12 z-10 bg-white dark:bg-[#252836] border border-white-border dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[140px]">
                      <Link
                        href={`/children/${child.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                        onClick={() => setOpenMenu(null)}
                      >
                        <Eye size={13} /> Bax
                      </Link>
                      <Link
                        href={`/children/${child.id}/edit`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                        onClick={() => setOpenMenu(null)}
                      >
                        <Pencil size={13} /> Redaktə et
                      </Link>
                      {child.status === 'Active' ? (
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 transition-colors"
                          onClick={() => { onToggleStatus?.(child.id, child.status); setOpenMenu(null); }}
                        >
                          <UserX size={13} /> Deaktiv et
                        </button>
                      ) : (
                        <>
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                            onClick={() => { onToggleStatus?.(child.id, child.status); setOpenMenu(null); }}
                          >
                            <UserCheck size={13} /> Aktiv et
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 transition-colors"
                            onClick={() => { onDelete?.(child.id); setOpenMenu(null); }}
                          >
                            <Trash2 size={13} /> Sil
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
