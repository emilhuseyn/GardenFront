'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ReceiptText } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/constants';
import { childrenApi } from '@/lib/api/children';
import { paymentsApi, type PaymentWithBatch } from '@/lib/api/payments';
import { openReceiptBlob } from '@/components/payments/receipt';
import type { ChildStatus } from '@/types';

const CURRENT_YEAR = new Date().getFullYear();
const MONTHS_SHORT = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];

export type PaymentCell = 'paid' | 'partial' | 'unpaid' | 'free' | null;

/** Bir kütləvi ödəniş paketi — vahid çeki tarixçədən təkrar çap etmək üçün */
interface ReceiptBatch {
  batchId: string;
  label: string;
  monthCount: number;
  total: number;
  sortKey: number;
}

interface ChildPayRow {
  id: string;
  firstName: string;
  lastName: string;
  childStatus: ChildStatus;
  groupName: string;
  monthlyFee: number;
  discountPercentage?: number | null;
  parentFullName?: string;
  secondParentFullName?: string;
  scheduleType?: string;
  payments: Record<number, PaymentCell>;
  amounts: Record<number, { paid: number; remaining: number; final: number; notes?: string }>;
  cashboxNames: Record<number, string | undefined>;
  batches: ReceiptBatch[];
}

/**
 * Uşağın bütün ödəniş tarixçəsindən kütləvi ödəniş paketlərini çıxarır.
 * Cədvəl yalnız cari ili göstərsə də, paketlər bütün illər üzrə toplanır —
 * keçən ilin vahid çeki də təkrar çap oluna bilsin.
 */
function buildReceiptBatches(payments: PaymentWithBatch[]): ReceiptBatch[] {
  const grouped = new Map<string, PaymentWithBatch[]>();

  payments.forEach((p) => {
    if (!p.paymentBatchId) return;
    const list = grouped.get(p.paymentBatchId);
    if (list) list.push(p);
    else grouped.set(p.paymentBatchId, [p]);
  });

  return Array.from(grouped.entries())
    .map(([batchId, items]) => {
      const ordered = [...items].sort((a, b) => (a.year - b.year) || (a.month - b.month));
      const first = ordered[0];
      const last = ordered[ordered.length - 1];

      const label =
        first.year !== last.year
          ? `${MONTHS_SHORT[first.month - 1]} ${first.year} – ${MONTHS_SHORT[last.month - 1]} ${last.year}`
          : first.month === last.month
            ? `${MONTHS_SHORT[first.month - 1]} ${first.year}`
            : `${MONTHS_SHORT[first.month - 1]}–${MONTHS_SHORT[last.month - 1]} ${first.year}`;

      return {
        batchId,
        label,
        monthCount: ordered.length,
        total: ordered.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0),
        sortKey: last.year * 100 + last.month,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey);   // ən son ödəniş yuxarıda
}

const CELL_CLASS: Record<string, string> = {
  paid:    'bg-green-400 text-white',
  partial: 'bg-accent-amber text-white',
  unpaid:  'bg-accent-rose text-white',
  free:    'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
};
const CELL_LABEL: Record<string, string> = {
  paid: '✓', partial: '½', unpaid: '✕', free: '–'
};

interface PaymentTableProps {
  onRecord?: (childId: string, month: number, childName: string) => void;
  refreshKey?: number;
  groupId?: number | null;
  search?: string;
  statusFilter?: 'all' | 'has-debt' | 'has-partial' | 'full' | 'free';
  discountFilter?: 'all' | 'has_discount' | 'no_discount';
  scheduleFilter?: string;   // 'all' or any ScheduleConfig.code
  sortBy?: 'name' | 'fee';
  onInitialLoadDone?: () => void;
}

export function PaymentTable({
  onRecord,
  refreshKey = 0,
  groupId,
  search = '',
  statusFilter = 'all',
  discountFilter = 'all',
  scheduleFilter = 'all',
  sortBy = 'name',
  onInitialLoadDone,
}: PaymentTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ChildPayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadNotifiedRef = useRef(false);
  // Vahid çekin təkrar çapı — bir neçə paket varsa seçim pəncərəsi açılır
  const [batchPicker, setBatchPicker] = useState<{ childName: string; batches: ReceiptBatch[] } | null>(null);
  const [batchLoadingId, setBatchLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadRows = async () => {
      setLoading(true);
      setRows([]);

      try {
        const fetchChildrenByStatus = async (status: 'Active' | 'Inactive') => {
          // Prefer backend "return all" behavior when pageSize <= 0.
          const allAtOnce = await childrenApi.getAll({ status, groupId: groupId ?? undefined, pageSize: 0 });
          const totalPages = Math.max(allAtOnce.totalPages || 1, 1);

          if (!allAtOnce.hasNextPage && totalPages <= 1) {
            return allAtOnce.items;
          }

          // Fallback for backends that still paginate despite pageSize 0.
          const pageSize = 200;
          const firstPage = await childrenApi.getAll({ status, groupId: groupId ?? undefined, page: 1, pageSize });
          let allItems = [...firstPage.items];
          const fallbackTotalPages = Math.max(firstPage.totalPages || 1, 1);

          if (firstPage.hasNextPage || fallbackTotalPages > 1) {
            for (let page = 2; page <= fallbackTotalPages; page += 1) {
              const nextPage = await childrenApi.getAll({ status, groupId: groupId ?? undefined, page, pageSize });
              allItems = allItems.concat(nextPage.items);
            }
          }

          return allItems;
        };

        const activeResult = await fetchChildrenByStatus('Active');
        const children = Array.from(
          new Map(activeResult.map((child) => [child.id, child])).values()
        );
        const paymentHistories = await Promise.all(
          children.map((c) => paymentsApi.getChildHistory(c.id).catch(() => [] as PaymentWithBatch[]))
        );

        const mapped: ChildPayRow[] = children.map((child, i) => {
          const payments: Record<number, PaymentCell> = {};
          const amounts: Record<number, { paid: number; remaining: number; final: number; notes?: string }> = {};
          const cashboxNames: Record<number, string | undefined> = {};
          const isFreeChild = child.discountPercentage === 100;
          paymentHistories[i]
            .filter((p) => Number(p.year) === CURRENT_YEAR)
            .forEach((p) => {
              let cell: PaymentCell;
              if (isFreeChild || p.finalAmount <= 0) {
                cell = 'free';   // 100% discount — no payment needed
              } else if (p.remainingDebt <= 0) {
                cell = 'paid';
              } else if (p.paidAmount > 0) {
                cell = 'partial';
              } else {
                cell = 'unpaid';
              }
              payments[p.month - 1] = cell;
              amounts[p.month - 1] = { paid: p.paidAmount, remaining: p.remainingDebt, final: p.finalAmount, notes: p.notes ?? undefined };
              cashboxNames[p.month - 1] = p.cashboxName;
            });
          return {
            id: String(child.id),
            firstName: child.firstName,
            lastName: child.lastName,
            childStatus: child.status,
            groupName: child.groupName,              scheduleType: child.scheduleType,            monthlyFee: child.monthlyFee,
            discountPercentage: child.discountPercentage,
            parentFullName: child.parentFullName,
            secondParentFullName: child.secondParentFullName,
            payments,
            amounts,
            cashboxNames,
            batches: buildReceiptBatches(paymentHistories[i]),
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

  const handleDownloadBatch = async (batchId: string) => {
    setBatchLoadingId(batchId);
    try {
      const ok = await openReceiptBlob(() => paymentsApi.downloadBatchReceipt(batchId));
      if (ok) setBatchPicker(null);
    } finally {
      setBatchLoadingId(null);
    }
  };

  const handleReceiptClick = (row: ChildPayRow) => {
    if (row.batches.length === 0) return;
    if (row.batches.length === 1) {
      void handleDownloadBatch(row.batches[0].batchId);
      return;
    }
    setBatchPicker({ childName: `${row.firstName} ${row.lastName}`, batches: row.batches });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-white-border dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/40">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Uşaq</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Məbləğ</th>
              {MONTHS_SHORT.map((m) => <th key={m} className="px-2 py-3 text-center text-xs font-semibold text-gray-500">{m}</th>)}
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Çek</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-white-border dark:border-gray-700/40">
                <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                {MONTHS_SHORT.map((_, mi) => <td key={mi} className="px-2 py-3"><Skeleton className="h-7 w-7 rounded-md mx-auto" /></td>)}
                <td className="px-3 py-3"><Skeleton className="h-7 w-20 rounded-md mx-auto" /></td>
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
        r.groupName.toLowerCase().includes(q) ||
        (r.parentFullName && r.parentFullName.toLowerCase().includes(q)) ||
        (r.secondParentFullName && r.secondParentFullName.toLowerCase().includes(q))
      )
    : rows;

  const scheduleFiltered = searchFiltered.filter((r) => {
    if (!scheduleFilter || scheduleFilter === 'all') return true;
    return String(r.scheduleType ?? '') === scheduleFilter;
  });

  const discountFiltered = scheduleFiltered.filter((r) => {
    if (discountFilter === 'has_discount') return r.discountPercentage && r.discountPercentage > 0;
    if (discountFilter === 'no_discount') return !r.discountPercentage || r.discountPercentage <= 0;
    return true;
  });

  const statusFiltered =
    statusFilter === 'has-debt'    ? discountFiltered.filter((r) => Object.values(r.payments).some((c) => c === 'unpaid')) :
    statusFilter === 'has-partial' ? discountFiltered.filter((r) => Object.values(r.payments).some((c) => c === 'partial' || c === 'unpaid')) :
    statusFilter === 'full'        ? discountFiltered.filter((r) => !Object.values(r.payments).some((c) => c === 'unpaid' || c === 'partial') && r.discountPercentage !== 100) :
    statusFilter === 'free'        ? discountFiltered.filter((r) => r.discountPercentage === 100) :
    discountFiltered;

  // R1: cədvəlin altındakı yekun sətirləri — ştabın istədiyi "ümumi analiz".
  // Süzgəclərə TABEDİR: ekranda görünən sətirlər nə göstərirsə, yekun da onu toplayır.
  const monthTotals = MONTHS_SHORT.map((_, mi) => {
    let due = 0;
    let paid = 0;
    for (const r of statusFiltered) {
      const a2 = r.amounts[mi];
      if (!a2 || a2.final <= 0) continue;   // 100% endirimli aylar sayılmır
      due += a2.final;
      paid += a2.paid;
    }
    return { due, paid };
  });

  const filteredRows = [...statusFiltered].sort((a, b) =>
    sortBy === 'fee'
      ? b.monthlyFee - a.monthlyFee
      : `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'az')
  );

  return (
    <>
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
            <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Çek
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 && !loading ? (
            <tr><td colSpan={15} className="text-center text-sm text-gray-400 py-8">Nəticə tapılmadı</td></tr>
          ) : filteredRows.map((row, ri) => (
            <motion.tr
              key={row.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: ri * 0.03 }}
              className={cn(
                'border-b border-white-border dark:border-gray-700/40 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors',
                row.childStatus === 'Inactive' && 'bg-gray-50/70 dark:bg-gray-800/20'
              )}
            >
              <td className={cn(
                'px-4 py-3 sticky left-0 bg-white dark:bg-[#1e2130]',
                row.childStatus === 'Inactive' && 'bg-gray-50/70 dark:bg-gray-800/20'
              )}>
                <div
                  className="flex items-center gap-2.5 cursor-pointer group"
                  onClick={() => router.push(`/children/${row.id}`)}
                >
                  <Avatar name={`${row.firstName} ${row.lastName}`} size="sm" />
                  <div>
                    <p className={cn(
                      'text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-primary transition-colors',
                      row.childStatus === 'Inactive' && 'text-gray-500 dark:text-gray-400'
                    )}>
                      {row.firstName} {row.lastName}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-400">{row.groupName}</p>
                      {row.childStatus === 'Inactive' && (
                        <Badge variant="inactive" size="xs">Deaktiv</Badge>
                      )}
                    </div>
                    {row.parentFullName ? (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Valideyn: {row.parentFullName}
                      </p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                {row.discountPercentage === 100 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                    Ödənişsiz
                  </span>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 font-mono-nums">
                      {formatCurrency(row.monthlyFee)}
                    </span>
                    {row.discountPercentage && row.discountPercentage > 0 ? (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200/60 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50 align-text-bottom">
                        -{row.discountPercentage}%
                      </span>
                    ) : null}
                  </>
                )}
              </td>
              {MONTHS_SHORT.map((_, mi) => {
                const cell = row.payments[mi];
                const amt = row.amounts[mi];
                const cbName = row.cashboxNames[mi];
                const tooltipParts: string[] = [];
                if (amt) {
                  if (amt.final <= 0) {
                    tooltipParts.push('Ödənişsiz (100% endirim)');
                  } else {
                    if (amt.notes) tooltipParts.push(amt.notes);
                    tooltipParts.push(`Olmalı idi: ${formatCurrency(amt.final)}`);
                    tooltipParts.push(`Ödənildi: ${formatCurrency(amt.paid)}`);
                    if (amt.remaining > 0) tooltipParts.push(`Qalıq: ${formatCurrency(amt.remaining)}`);
                    if (cbName) tooltipParts.push(`Kassa: ${cbName}`);
                  }
                }
                return (
                  <td key={mi} className="px-1 py-2 text-center">
                    <button
                      onClick={() => cell !== 'free' && onRecord?.(row.id, mi + 1, `${row.firstName} ${row.lastName}`)}
                      title={tooltipParts.length ? tooltipParts.join(' · ') : (cell ? undefined : `${MONTHS_SHORT[mi]}: Qeyd et`)}
                      className={cn(
                        'rounded-md transition-all mx-auto flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[44px]',
                        cell === 'free'
                          ? CELL_CLASS['free'] + ' cursor-default'
                          : cell
                            ? CELL_CLASS[cell] + ' hover:opacity-80'
                            : 'bg-gray-100 dark:bg-gray-700/60 text-gray-300 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      <span className="text-xs font-bold leading-none">{cell ? CELL_LABEL[cell] : '·'}</span>
                      {amt && amt.final > 0 && (
                        <span className="text-[9px] leading-none opacity-90 font-mono">
                          {formatCurrency(amt.paid)}
                        </span>
                      )}
                      {/* R1: ştab "nə qədər olmalı idi / nə qədər ödənilib" müqayisəsini
                          cədvəldə görmək istəyir. Yalnız FƏRQLİ olduqda göstərilir ki,
                          tam ödənilmiş aylar lüzumsuz iki sətirlə dolmasın. */}
                      {amt && amt.final > 0 && amt.final !== amt.paid && (
                        <span className="text-[8px] leading-none opacity-60 font-mono">
                          /{formatCurrency(amt.final)}
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
              {/* Vahid çek — kütləvi ödəniş paketini həftələr sonra da təkrar çap etmək üçün */}
              <td className="px-2 py-2 text-center">
                {row.batches.length === 0 ? (
                  <span className="text-xs text-gray-300 dark:text-gray-600">–</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReceiptClick(row)}
                    disabled={batchLoadingId !== null}
                    title={
                      row.batches.length === 1
                        ? `Vahid çek: ${row.batches[0].label} (${row.batches[0].monthCount} ay)`
                        : `${row.batches.length} kütləvi ödəniş — vahid çeki seçin`
                    }
                    className="mx-auto inline-flex items-center gap-1 rounded-md border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#252836] px-2 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {batchLoadingId !== null && row.batches.some((b) => b.batchId === batchLoadingId) ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ReceiptText size={12} />
                    )}
                    Vahid çek
                    {row.batches.length > 1 && (
                      <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/10 px-1 text-[9px] font-bold text-primary">
                        {row.batches.length}
                      </span>
                    )}
                  </button>
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>

        {/* R1: "normalda nə qədər ödəniş olmalı idi, amma nə qədər ödəyiblər" —
            ştabın istədiyi ümumi analiz. Sətirlər süzgəclərə tabedir. */}
        {filteredRows.length > 0 && (
          <tfoot className="border-t-2 border-gray-200 dark:border-gray-700">
            <tr className="bg-gray-50/70 dark:bg-gray-800/40">
              <td className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 sticky left-0 bg-gray-50/70 dark:bg-gray-800/40">
                Olmalı idi
              </td>
              <td />
              {monthTotals.map((t, mi) => (
                <td key={mi} className="px-1 py-2 text-center text-[10px] font-mono font-semibold text-gray-700 dark:text-gray-300">
                  {t.due > 0 ? formatCurrency(t.due) : '·'}
                </td>
              ))}
              <td />
            </tr>
            <tr className="bg-gray-50/70 dark:bg-gray-800/40">
              <td className="px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 sticky left-0 bg-gray-50/70 dark:bg-gray-800/40">
                Ödənilib
              </td>
              <td />
              {monthTotals.map((t, mi) => (
                <td key={mi} className="px-1 py-2 text-center text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  {t.due > 0 ? formatCurrency(t.paid) : '·'}
                </td>
              ))}
              <td />
            </tr>
            <tr className="bg-gray-50/70 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-700/60">
              <td className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 sticky left-0 bg-gray-50/70 dark:bg-gray-800/40">
                Fərq
              </td>
              <td />
              {monthTotals.map((t, mi) => {
                const diff = t.due - t.paid;
                return (
                  <td
                    key={mi}
                    className={cn(
                      'px-1 py-2 text-center text-[10px] font-mono font-bold',
                      diff > 0
                        ? 'text-accent-rose'
                        : diff < 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-400'
                    )}
                  >
                    {t.due > 0 ? formatCurrency(diff) : '·'}
                  </td>
                );
              })}
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>

    {/* Bir uşağın bir neçə kütləvi ödənişi varsa — hansının çeki çap olunsun */}
    <Modal
      open={Boolean(batchPicker)}
      onOpenChange={(open) => { if (!open && !batchLoadingId) setBatchPicker(null); }}
    >
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Vahid çek</ModalTitle>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-200">{batchPicker?.childName}</span> üçün
            {' '}kütləvi ödənişlər. Çeki çap etmək üçün birini seçin.
          </p>
        </ModalHeader>

        <div className="space-y-2">
          {batchPicker?.batches.map((b) => (
            <button
              key={b.batchId}
              type="button"
              onClick={() => handleDownloadBatch(b.batchId)}
              disabled={batchLoadingId !== null}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-white-border dark:border-gray-700/60 px-3 py-2.5 text-left hover:border-primary/40 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{b.label}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono-nums">
                  {b.monthCount} ay · {formatCurrency(b.total)}
                </p>
              </div>
              {batchLoadingId === b.batchId
                ? <Loader2 size={15} className="shrink-0 animate-spin text-primary" />
                : <ReceiptText size={15} className="shrink-0 text-gray-400" />}
            </button>
          ))}
        </div>
      </ModalContent>
    </Modal>
    </>
  );
}
