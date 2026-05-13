'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchBar } from '@/components/ui/SearchBar';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/constants';
import { childrenApi } from '@/lib/api/children';
import { paymentsApi } from '@/lib/api/payments';
import { CalendarX, DollarSign, UserX } from 'lucide-react';
import type { Child, Payment } from '@/types';

const AZ_MONTHS = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];
const AZ_MONTHS_FULL = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avqust','sentyabr','oktyabr','noyabr','dekabr'];

interface UnpaidMonth {
  month: number;
  year: number;
  remaining: number;
  final: number;
  paid: number;
}

interface InactiveRow {
  child: Child;
  totalDebt: number;
  unpaidMonths: UnpaidMonth[];
  deactivationMonth?: number;
  deactivationYear?: number;
  deactivationDateLabel?: string;
}

interface InactivePaymentListProps {
  refreshKey?: number;
  onRecord?: (childId: number, month?: number, childName?: string) => void;
  onInitialLoadDone?: () => void;
}

function formatDateAz(dateStr?: string | null): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${d.getDate()} ${AZ_MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

export function InactivePaymentList({ refreshKey = 0, onRecord, onInitialLoadDone }: InactivePaymentListProps) {
  const router = useRouter();
  const [rows, setRows] = useState<InactiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with-debt' | 'paid-off'>('with-debt');

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadInactive = async () => {
      try {
        const fetchAll = async () => {
          const allAtOnce = await childrenApi.getAll({ status: 'Inactive', pageSize: 0 }, { silentError: true });
          const totalPages = Math.max(allAtOnce.totalPages || 1, 1);
          if (!allAtOnce.hasNextPage && totalPages <= 1) return allAtOnce.items;

          const pageSize = 200;
          const firstPage = await childrenApi.getAll({ status: 'Inactive', page: 1, pageSize }, { silentError: true });
          let allItems = [...firstPage.items];
          const fallbackTotalPages = Math.max(firstPage.totalPages || 1, 1);
          if (firstPage.hasNextPage || fallbackTotalPages > 1) {
            for (let page = 2; page <= fallbackTotalPages; page += 1) {
              const np = await childrenApi.getAll({ status: 'Inactive', page, pageSize }, { silentError: true });
              allItems = allItems.concat(np.items);
            }
          }
          return allItems;
        };

        const children = await fetchAll();
        const histories = await Promise.all(
          children.map((c) => paymentsApi.getChildHistory(c.id).catch(() => [] as Payment[]))
        );

        const mapped: InactiveRow[] = children.map((child, i) => {
          const isFreeChild = child.discountPercentage === 100;
          const unpaid: UnpaidMonth[] = histories[i]
            .filter((p) => {
              if (isFreeChild || p.finalAmount <= 0) return false;
              return (p.remainingDebt ?? Math.max(0, p.finalAmount - p.paidAmount)) > 0;
            })
            .map((p) => ({
              month: p.month,
              year: p.year,
              remaining: p.remainingDebt ?? Math.max(0, p.finalAmount - p.paidAmount),
              final: p.finalAmount,
              paid: p.paidAmount,
            }))
            .sort((a, b) => (b.year - a.year) || (b.month - a.month));

          const totalDebt = unpaid.reduce((sum, m) => sum + m.remaining, 0);

          let deactivationMonth: number | undefined;
          let deactivationYear: number | undefined;
          if (child.deactivationDate) {
            const d = new Date(child.deactivationDate);
            if (!Number.isNaN(d.getTime())) {
              deactivationMonth = d.getMonth() + 1;
              deactivationYear = d.getFullYear();
            }
          }

          return {
            child,
            totalDebt,
            unpaidMonths: unpaid,
            deactivationMonth,
            deactivationYear,
            deactivationDateLabel: formatDateAz(child.deactivationDate),
          };
        });

        if (active) setRows(mapped);
      } catch {
        if (active) setRows([]);
      } finally {
        if (active) {
          setLoading(false);
          onInitialLoadDone?.();
        }
      }
    };

    void loadInactive();
    return () => { active = false; };
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(() => {
    let result = rows;
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((r) =>
        `${r.child.firstName} ${r.child.lastName}`.toLowerCase().includes(q) ||
        r.child.groupName.toLowerCase().includes(q) ||
        (r.child.parentFullName?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filter === 'with-debt') result = result.filter((r) => r.totalDebt > 0);
    if (filter === 'paid-off') result = result.filter((r) => r.totalDebt === 0);

    return [...result].sort((a, b) => {
      // First: by total debt (desc), then by deactivation date (newest first)
      if (b.totalDebt !== a.totalDebt) return b.totalDebt - a.totalDebt;
      const aDate = a.child.deactivationDate ? new Date(a.child.deactivationDate).getTime() : 0;
      const bDate = b.child.deactivationDate ? new Date(b.child.deactivationDate).getTime() : 0;
      return bDate - aDate;
    });
  }, [rows, search, filter]);

  const totalsWithDebt = rows.filter((r) => r.totalDebt > 0);
  const totalDebtSum = totalsWithDebt.reduce((s, r) => s + r.totalDebt, 0);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-900/15 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <UserX size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p><b>Deaktiv uşaqların ödənişi.</b> Burada bağçanı tərk etmiş uşaqların qalıq borcunu ödənişə qəbul edə bilərsiniz. Yuvarlaqlaşdırma yalnız bu bölmədə fəaldır.</p>
            <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/80">
              Ödəniş normal qaydada kassaya düşür və günlük hesabatda görsənir.
            </p>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] px-3 py-2.5">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Cəmi deaktiv</p>
          <p className="text-base font-bold text-gray-800 dark:text-gray-100 mt-0.5">{rows.length} uşaq</p>
        </div>
        <div className="rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-900/15 px-3 py-2.5">
          <p className="text-[11px] text-rose-700 dark:text-rose-400 uppercase tracking-wide font-semibold">Borclu</p>
          <p className="text-base font-bold text-rose-700 dark:text-rose-400 mt-0.5">{totalsWithDebt.length} uşaq</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-900/15 px-3 py-2.5">
          <p className="text-[11px] text-amber-700 dark:text-amber-400 uppercase tracking-wide font-semibold">Cəmi qalıq borc</p>
          <p className="text-base font-bold text-amber-700 dark:text-amber-400 font-mono-nums mt-0.5">{formatCurrency(totalDebtSum)}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Uşaq, qrup və ya valideyn adı..."
          className="flex-1 min-w-[200px] w-full sm:w-auto"
        />
        <div className="flex flex-wrap gap-1.5">
          {([
            { v: 'with-debt', label: 'Borclu' },
            { v: 'paid-off',  label: 'Borcsuz' },
            { v: 'all',       label: 'Hamısı' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                filter === v
                  ? 'bg-primary text-white border-primary'
                  : 'border-white-border dark:border-gray-700/60 text-gray-600 dark:text-gray-300 hover:border-primary/50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-white-border dark:border-gray-700/60 bg-white/50 dark:bg-[#1e2130]/50">
          <p className="text-sm text-gray-400">
            {rows.length === 0
              ? 'Heç bir deaktiv uşaq tapılmadı'
              : filter === 'with-debt'
                ? 'Borclu deaktiv uşaq yoxdur 🎉'
                : 'Filtrə uyğun nəticə yoxdur'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRows.map((row, idx) => {
            const name = `${row.child.firstName} ${row.child.lastName}`;
            const hasDebt = row.totalDebt > 0;
            // Pick default month for the form: most recent unpaid, else deactivation month
            const defaultMonth = row.unpaidMonths[0]?.month ?? row.deactivationMonth;

            return (
              <motion.div
                key={row.child.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={cn(
                  'rounded-2xl border bg-white dark:bg-[#1e2130] p-4 transition-shadow hover:shadow-sm',
                  hasDebt
                    ? 'border-rose-200/70 dark:border-rose-900/40'
                    : 'border-white-border dark:border-gray-700/60'
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/children/${row.child.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/children/${row.child.id}`);
                      }
                    }}
                    title="Uşağın detal səhifəsinə keç"
                    className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/30 focus:rounded-lg -mx-1 px-1 -my-0.5 py-0.5"
                  >
                    <Avatar name={name} size="md" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-primary transition-colors truncate">{name}</h3>
                        <Badge variant="inactive" size="xs">Deaktiv</Badge>
                        {row.child.discountPercentage && row.child.discountPercentage > 0 && row.child.discountPercentage < 100 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200/60 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50">
                            -{row.child.discountPercentage}%
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        <span>{row.child.groupName}</span>
                        {row.deactivationDateLabel && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarX size={10} /> {row.deactivationDateLabel}
                            </span>
                          </>
                        )}
                        {row.child.parentFullName && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <span className="truncate">Valideyn: {row.child.parentFullName}</span>
                          </>
                        )}
                      </div>

                      {row.unpaidMonths.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.unpaidMonths.slice(0, 6).map((m) => (
                            <span
                              key={`${m.year}-${m.month}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/40"
                              title={`Cəmi: ${formatCurrency(m.final)} · Ödənilib: ${formatCurrency(m.paid)}`}
                            >
                              <b>{AZ_MONTHS[m.month - 1]}</b> {formatCurrency(m.remaining)}
                            </span>
                          ))}
                          {row.unpaidMonths.length > 6 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/40">
                              +{row.unpaidMonths.length - 6} ay
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-auto">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Qalıq borc</p>
                      <p className={cn(
                        'text-lg font-extrabold font-mono-nums leading-none mt-0.5',
                        hasDebt ? 'text-rose-700 dark:text-rose-400' : 'text-green-600 dark:text-green-400'
                      )}>
                        {hasDebt ? formatCurrency(row.totalDebt) : '0 ₼'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={hasDebt ? 'primary' : 'secondary'}
                      onClick={() => onRecord?.(row.child.id, defaultMonth, name)}
                    >
                      <DollarSign size={13} /> Ödəniş et
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
