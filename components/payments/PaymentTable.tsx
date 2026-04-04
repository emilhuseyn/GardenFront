'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/constants';
import { childrenApi } from '@/lib/api/children';
import { paymentsApi } from '@/lib/api/payments';
import type { Payment } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const MONTHS_SHORT = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];

export type PaymentCell = 'paid' | 'partial' | 'unpaid' | null;

interface ChildPayRow {
  id: string;
  firstName: string;
  lastName: string;
  groupName: string;
  monthlyFee: number;
  payments: Record<number, PaymentCell>;
  amounts: Record<number, { paid: number; remaining: number }>;
  cashboxNames: Record<number, string | undefined>;
}

const CELL_CLASS: Record<string, string> = {
  paid:    'bg-green-400 text-white',
  partial: 'bg-accent-amber text-white',
  unpaid:  'bg-accent-rose text-white',
};
const CELL_LABEL: Record<string, string> = {
  paid: '✓', partial: '½', unpaid: '✕'
};

interface PaymentTableProps {
  onRecord?: (childId: string, month: number, childName: string) => void;
  refreshKey?: number;
  groupId?: number | null;
  search?: string;
  statusFilter?: 'all' | 'has-debt' | 'has-partial' | 'full';
  sortBy?: 'name' | 'fee';
  onInitialLoadDone?: () => void;
}

export function PaymentTable({ onRecord, refreshKey = 0, groupId, search = '', statusFilter = 'all', sortBy = 'name', onInitialLoadDone }: PaymentTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ChildPayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadNotifiedRef = useRef(false);

  useEffect(() => {
    let active = true;

    const loadRows = async () => {
      setLoading(true);
      setRows([]);

      try {
        const result = await childrenApi.getAll({ status: 'Active', pageSize: 50, groupId: groupId ?? undefined });
        const children = result.items;
        const paymentHistories = await Promise.all(
          children.map((c) => paymentsApi.getChildHistory(c.id).catch(() => [] as Payment[]))
        );

        const mapped: ChildPayRow[] = children.map((child, i) => {
          const payments: Record<number, PaymentCell> = {};
          const amounts: Record<number, { paid: number; remaining: number }> = {};
          const cashboxNames: Record<number, string | undefined> = {};
          paymentHistories[i]
            .filter((p) => Number(p.year) === CURRENT_YEAR)
            .forEach((p) => {
              let cell: PaymentCell;
              if (p.remainingDebt <= 0) {
                cell = 'paid';
              } else if (p.paidAmount > 0) {
                cell = 'partial';
              } else {
                cell = 'unpaid';
              }
              payments[p.month - 1] = cell;
              amounts[p.month - 1] = { paid: p.paidAmount, remaining: p.remainingDebt };
              cashboxNames[p.month - 1] = p.cashboxName;
            });
          return {
            id: String(child.id),
            firstName: child.firstName,
            lastName: child.lastName,
            groupName: child.groupName,
            monthlyFee: child.monthlyFee,
            payments,
            amounts,
            cashboxNames,
          };
        });

        if (active) setRows(mapped);
      } catch {
        if (active) setRows([]);
      } finally {
        if (active) {
          setLoading(false);
          if (!initialLoadNotifiedRef.current) {
            initialLoadNotifiedRef.current = true;
            onInitialLoadDone?.();
          }
        }
      }
    };

    void loadRows();
    return () => {
      active = false;
    };
  }, [refreshKey, groupId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-white-border dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/40">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Uşaq</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Məbləğ</th>
              {MONTHS_SHORT.map((m) => <th key={m} className="px-2 py-3 text-center text-xs font-semibold text-gray-500">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-white-border dark:border-gray-700/40">
                <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                {MONTHS_SHORT.map((_, mi) => <td key={mi} className="px-2 py-3"><Skeleton className="h-7 w-7 rounded-md mx-auto" /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const q = search.toLowerCase();
  const searchFiltered = q
    ? rows.filter((r) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.groupName.toLowerCase().includes(q)
      )
    : rows;

  const statusFiltered =
    statusFilter === 'has-debt'    ? searchFiltered.filter((r) => Object.values(r.payments).some((c) => c === 'unpaid')) :
    statusFilter === 'has-partial' ? searchFiltered.filter((r) => Object.values(r.payments).some((c) => c === 'partial')) :
    statusFilter === 'full'        ? searchFiltered.filter((r) => !Object.values(r.payments).some((c) => c === 'unpaid' || c === 'partial')) :
    searchFiltered;

  const filteredRows = [...statusFiltered].sort((a, b) =>
    sortBy === 'fee'
      ? b.monthlyFee - a.monthlyFee
      : `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'az')
  );

  return (
    <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="border-b border-white-border dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/40">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50/50 dark:bg-gray-800/40">
              Uşaq
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Məbləğ
            </th>
            {MONTHS_SHORT.map((m, i) => (
              <th key={i} className="px-2 py-3 text-center text-xs font-semibold text-gray-500">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 && !loading ? (
            <tr><td colSpan={14} className="text-center text-sm text-gray-400 py-8">Nəticə tapılmadı</td></tr>
          ) : filteredRows.map((row, ri) => (
            <motion.tr
              key={row.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: ri * 0.03 }}
              className="border-b border-white-border dark:border-gray-700/40 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <td className="px-4 py-3 sticky left-0 bg-white dark:bg-[#1e2130]">
                <div
                  className="flex items-center gap-2.5 cursor-pointer group"
                  onClick={() => router.push(`/children/${row.id}`)}
                >
                  <Avatar name={`${row.firstName} ${row.lastName}`} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-primary transition-colors">{row.firstName} {row.lastName}</p>
                    <p className="text-xs text-gray-400">{row.groupName}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 font-mono-nums">
                  {formatCurrency(row.monthlyFee)}
                </span>
              </td>
              {MONTHS_SHORT.map((_, mi) => {
                const cell = row.payments[mi];
                const amt = row.amounts[mi];
                const cbName = row.cashboxNames[mi];
                const tooltipParts: string[] = [];
                if (amt) {
                  tooltipParts.push(`Ödənildi: ${formatCurrency(amt.paid)}`);
                  if (amt.remaining > 0) tooltipParts.push(`Qalıq: ${formatCurrency(amt.remaining)}`);
                  if (cbName) tooltipParts.push(`Kassa: ${cbName}`);
                }
                return (
                  <td key={mi} className="px-1 py-2 text-center">
                    <button
                      onClick={() => onRecord?.(row.id, mi + 1, `${row.firstName} ${row.lastName}`)}
                      title={tooltipParts.length ? tooltipParts.join(' · ') : (cell ? undefined : `${MONTHS_SHORT[mi]}: Qeyd et`)}
                      className={cn(
                        'rounded-md transition-all mx-auto flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px]',
                        cell
                          ? CELL_CLASS[cell] + ' hover:opacity-80'
                          : 'bg-gray-100 dark:bg-gray-700/60 text-gray-300 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      <span className="text-xs font-bold leading-none">{cell ? CELL_LABEL[cell] : '·'}</span>
                      {amt && (
                        <span className="text-[9px] leading-none opacity-90 font-mono">
                          {formatCurrency(amt.paid)}
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
