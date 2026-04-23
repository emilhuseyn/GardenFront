'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Filter, ListChecks, Layers, Phone } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { childrenApi } from '@/lib/api/children';
import { paymentsApi } from '@/lib/api/payments';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/constants';
import { useAuth } from '@/lib/hooks/useAuth';
import type { ChildFilters, ChildStatus, DebtorInfo } from '@/types';

type ViewMode = 'all' | 'grouped';
type SortMode = 'debt-desc' | 'debt-asc' | 'name-asc' | 'name-desc';
type GroupSortMode = 'debt-desc' | 'debt-asc' | 'count-desc' | 'count-asc' | 'name-asc';
type StatusFilter = 'all' | 'active' | 'inactive';
type DiscountFilter = 'all' | 'has_discount' | 'no_discount';

interface GroupDebtRow {
  key: string;
  groupName: string;
  divisionName: string;
  childCount: number;
  totalDebt: number;
  avgDebt: number;
}

interface ListRow extends DebtorInfo {
  parentFullName: string;
  status: ChildStatus;
  paymentDay: number;
  monthlyFee: number;
  scheduleType: string;
  discountPercentage?: number | null;
}

function fmtMonths(months: number[]) {
  return months
    .slice()
    .sort((a, b) => a - b)
    .map((m) => String(m).padStart(2, '0'))
    .join(', ');
}

function sanitizeFilePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

async function exportDebtWorkbook(rows: ListRow[], grouped: GroupDebtRow[], fileName: string) {
  const XLSX = await import('xlsx');

  const detailData = rows.map((r, i) => ({
    No: i + 1,
    Sagird: r.childFullName,
    ValideynAdSoyad: r.parentFullName,
    Bolme: r.divisionName,
    Qrup: r.groupName,
    ValideynElaqeNomresi: r.parentPhone,
    QaliqBorc: r.totalDebt,
    OdenilmemisAylar: fmtMonths(r.unpaidMonths),
  }));

  const groupData = grouped.map((g, i) => ({
    No: i + 1,
    Bolme: g.divisionName,
    Qrup: g.groupName,
    SagirdSayi: g.childCount,
    UmumiQaliqBorc: g.totalDebt,
    OrtaBorc: Number(g.avgDebt.toFixed(2)),
  }));

  const wb = XLSX.utils.book_new();
  const wsDetails = XLSX.utils.json_to_sheet(detailData);
  const wsGroups = XLSX.utils.json_to_sheet(groupData);

  XLSX.utils.book_append_sheet(wb, wsDetails, 'SagirdSiyahisi');
  XLSX.utils.book_append_sheet(wb, wsGroups, 'QruplarUzre');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ListsPage() {
  const { permissions } = useAuth();
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [discountFilter, setDiscountFilter] = useState<DiscountFilter>('all');
  const [paymentDayFilter, setPaymentDayFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'FullDay' | 'HalfDay'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('debt-desc');
  const [groupSortMode, setGroupSortMode] = useState<GroupSortMode>('debt-desc');

  useEffect(() => {
    let active = true;

    const fetchAllPages = async (filters: ChildFilters) => {
      const firstPage = await childrenApi.getAll(
        { ...filters, page: 1, pageSize: 0 },
        { silentError: true }
      );

      let allItems = [...firstPage.items];
      const totalPages = Math.max(firstPage.totalPages || 1, 1);

      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page += 1) {
          const nextPage = await childrenApi.getAll(
            { ...filters, page, pageSize: 0 },
            { silentError: true }
          );
          allItems = allItems.concat(nextPage.items);
        }
      }

      return allItems;
    };

    const run = async () => {
      try {
        const [activeChildren, inactiveChildren, debtors] = await Promise.all([
          fetchAllPages({ status: 'Active' }),
          fetchAllPages({ status: 'Inactive' }),
          paymentsApi.getDebtors({ silentError: true }).catch(() => [] as DebtorInfo[]),
        ]);

        const allChildren = [...activeChildren, ...inactiveChildren];
        const uniqueChildren = Array.from(new Map(allChildren.map((c) => [c.id, c])).values());
        const debtByChildId = new Map(debtors.map((d) => [d.childId, d]));

        const parentNameById = new Map<number, string>();
        const missingParentIds = uniqueChildren
          .filter((c) => !c.parentFullName?.trim())
          .map((c) => c.id);

        if (missingParentIds.length > 0) {
          const batchSize = 20;
          for (let i = 0; i < missingParentIds.length; i += batchSize) {
            if (!active) break;

            const batch = missingParentIds.slice(i, i + batchSize);
            const detailResults = await Promise.all(
              batch.map((id) =>
                childrenApi.getById(id)
                  .then((detail) => ({ id, name: detail.parentFullName }))
                  .catch(() => ({ id, name: '' }))
              )
            );

            for (const result of detailResults) {
              if (result.name?.trim()) {
                parentNameById.set(result.id, result.name.trim());
              }
            }
          }
        }

        const mapped: ListRow[] = uniqueChildren.map((child) => {
          const debtInfo = debtByChildId.get(child.id);
          return {
            childId: child.id,
            childFullName: `${child.lastName} ${child.firstName}`.trim(),
            parentFullName: child.parentFullName?.trim() || parentNameById.get(child.id) || '-',
            groupName: child.groupName,
            divisionName: child.divisionName,
            parentPhone: child.parentPhone,
            status: child.status,
            paymentDay: child.paymentDay,
            monthlyFee: child.monthlyFee,
            totalDebt: debtInfo?.totalDebt ?? child.totalDebt ?? 0,
            unpaidMonths: debtInfo?.unpaidMonths ?? [],
            scheduleType: child.scheduleType ?? 'FullDay',
            discountPercentage: child.discountPercentage,
          };
        });

        if (active) setRows(mapped);
      } catch {
        if (active) {
          setRows([]);
          toast.error('Siyahı yüklənmədi');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  const divisionOptions = useMemo(
    () => [
      { value: 'all', label: 'Bütün bölmələr' },
      ...Array.from(new Set(rows.map((r) => r.divisionName))).sort().map((d) => ({ value: d, label: d })),
    ],
    [rows]
  );

  const groupOptions = useMemo(
    () => [
      { value: 'all', label: 'Bütün qruplar' },
      ...Array.from(new Set(rows.map((r) => r.groupName))).sort().map((g) => ({ value: g, label: g })),
    ],
    [rows]
  );

  const paymentDayOptions = useMemo(
    () => [
      { value: 'all', label: 'Bütün ödəniş günləri' },
      ...Array.from(new Set(rows.map((r) => r.paymentDay)))
        .filter((day) => Number.isFinite(day) && day > 0)
        .sort((a, b) => a - b)
        .map((day) => ({ value: String(day), label: `${day}-ci gün` })),
    ],
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = rows.filter((r) => {
      if (divisionFilter !== 'all' && r.divisionName !== divisionFilter) return false;
      if (groupFilter !== 'all' && r.groupName !== groupFilter) return false;
      if (statusFilter === 'active' && r.status !== 'Active') return false;
      if (statusFilter === 'inactive' && r.status !== 'Inactive') return false;
      if (paymentDayFilter !== 'all' && String(r.paymentDay) !== paymentDayFilter) return false;
      if (scheduleFilter !== 'all' && r.scheduleType !== scheduleFilter) return false;
      if (discountFilter === 'has_discount' && (!r.discountPercentage || r.discountPercentage <= 0)) return false;
      if (discountFilter === 'no_discount' && r.discountPercentage && r.discountPercentage > 0) return false;
      if (!q) return true;

      return (
        r.childFullName.toLowerCase().includes(q)
        || r.parentFullName.toLowerCase().includes(q)
        || r.parentPhone.toLowerCase().includes(q)
        || r.groupName.toLowerCase().includes(q)
        || r.divisionName.toLowerCase().includes(q)
      );
    });

    return [...base].sort((a, b) => {
      switch (sortMode) {
        case 'debt-asc':
          return a.totalDebt - b.totalDebt;
        case 'name-asc':
          return a.childFullName.localeCompare(b.childFullName, 'az');
        case 'name-desc':
          return b.childFullName.localeCompare(a.childFullName, 'az');
        case 'debt-desc':
        default:
          return b.totalDebt - a.totalDebt;
      }
    });
  }, [rows, divisionFilter, groupFilter, statusFilter, paymentDayFilter, scheduleFilter, discountFilter, search, sortMode]);

  const baseForScheduleCounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (divisionFilter !== 'all' && r.divisionName !== divisionFilter) return false;
      if (groupFilter !== 'all' && r.groupName !== groupFilter) return false;
      if (statusFilter === 'active' && r.status !== 'Active') return false;
      if (statusFilter === 'inactive' && r.status !== 'Inactive') return false;
      if (paymentDayFilter !== 'all' && String(r.paymentDay) !== paymentDayFilter) return false;
      if (discountFilter === 'has_discount' && (!r.discountPercentage || r.discountPercentage <= 0)) return false;
      if (discountFilter === 'no_discount' && r.discountPercentage && r.discountPercentage > 0) return false;
      if (!q) return true;

      return (
        r.childFullName.toLowerCase().includes(q)
        || r.parentFullName.toLowerCase().includes(q)
        || r.parentPhone.toLowerCase().includes(q)
        || r.groupName.toLowerCase().includes(q)
        || r.divisionName.toLowerCase().includes(q)
      );
    });
  }, [rows, divisionFilter, groupFilter, statusFilter, paymentDayFilter, discountFilter, search]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, GroupDebtRow>();

    for (const r of filteredRows) {
      const key = `${r.divisionName}__${r.groupName}`;
      const current = map.get(key);
      if (current) {
        current.childCount += 1;
        current.totalDebt += r.totalDebt;
        current.avgDebt = current.totalDebt / current.childCount;
      } else {
        map.set(key, {
          key,
          divisionName: r.divisionName,
          groupName: r.groupName,
          childCount: 1,
          totalDebt: r.totalDebt,
          avgDebt: r.totalDebt,
        });
      }
    }

    const arr = Array.from(map.values());
    return arr.sort((a, b) => {
      switch (groupSortMode) {
        case 'debt-asc':
          return a.totalDebt - b.totalDebt;
        case 'count-desc':
          return b.childCount - a.childCount;
        case 'count-asc':
          return a.childCount - b.childCount;
        case 'name-asc':
          return a.groupName.localeCompare(b.groupName, 'az');
        case 'debt-desc':
        default:
          return b.totalDebt - a.totalDebt;
      }
    });
  }, [filteredRows, groupSortMode]);

  const totalDebt    = filteredRows.reduce((sum, r) => sum + r.totalDebt, 0);
  const fullDayCount = baseForScheduleCounts.filter((r) => r.scheduleType === 'FullDay').length;
  const halfDayCount = baseForScheduleCounts.filter((r) => r.scheduleType === 'HalfDay').length;

  const buildFilteredFileName = () => {
    const parts = ['sagird_siyahi'];

    if (groupFilter !== 'all') {
      parts.push(`qrup_${sanitizeFilePart(groupFilter)}`);
    }

    if (divisionFilter !== 'all') {
      parts.push(`bolme_${sanitizeFilePart(divisionFilter)}`);
    }

    if (statusFilter !== 'all') {
      parts.push(statusFilter === 'active' ? 'status_aktiv' : 'status_deaktiv');
    }

    if (paymentDayFilter !== 'all') {
      parts.push(`odenis_gunu_${paymentDayFilter}`);
    }

    if (discountFilter !== 'all') {
      parts.push(discountFilter === 'has_discount' ? 'endirimli' : 'endirimsiz');
    }

    if (search.trim()) {
      const searchPart = sanitizeFilePart(search.trim());
      if (searchPart) parts.push(`axtaris_${searchPart}`);
    }

    if (viewMode === 'grouped') {
      parts.push('qruplar_uzre');
    }

    parts.push('filtered');
    return `${parts.join('_')}.xlsx`;
  };

  const handleExportFiltered = async () => {
    try {
      await exportDebtWorkbook(filteredRows, groupedRows, buildFilteredFileName());
      toast.success('Filterə görə Excel yükləndi');
    } catch {
      toast.error('Excel export alınmadı');
    }
  };

  const handleExportAll = async () => {
    try {
      const groupedAllMap = new Map<string, GroupDebtRow>();
      for (const r of rows) {
        const key = `${r.divisionName}__${r.groupName}`;
        const current = groupedAllMap.get(key);
        if (current) {
          current.childCount += 1;
          current.totalDebt += r.totalDebt;
          current.avgDebt = current.totalDebt / current.childCount;
        } else {
          groupedAllMap.set(key, {
            key,
            divisionName: r.divisionName,
            groupName: r.groupName,
            childCount: 1,
            totalDebt: r.totalDebt,
            avgDebt: r.totalDebt,
          });
        }
      }

      const groupedAll = Array.from(groupedAllMap.values()).sort((a, b) => b.totalDebt - a.totalDebt);
      await exportDebtWorkbook(rows, groupedAll, 'sagird_siyahi_umumi.xlsx');
      toast.success('Ümumi Excel yükləndi');
    } catch {
      toast.error('Excel export alınmadı');
    }
  };

  if (!permissions.payments.view) {
    return null;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[90] bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <Image
            src="/KinderGardenLogo.png"
            alt="KinderGarden"
            width={220}
            height={64}
            priority
            className="h-16 w-auto object-contain"
          />
          <div className="w-9 h-9 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Siyahılar yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Siyahılar"
        description="Şagird, valideyn əlaqə nömrəsi və qalıq borc siyahısı"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportFiltered} disabled={loading || filteredRows.length === 0}>
              <Download size={14} /> Filterə görə Excel
            </Button>
            <Button size="sm" onClick={handleExportAll} disabled={loading || rows.length === 0}>
              <Download size={14} /> Ümumi Excel
            </Button>
          </div>
        }
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="green" size="sm">{filteredRows.length} şagird</Badge>
            <Badge variant="blue" size="sm">{groupedRows.length} qrup</Badge>
            <Badge variant="amber" size="sm">{formatCurrency(totalDebt)} qalıq borc</Badge>
          </div>
        }
      />

      <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4 space-y-3">
        <div className="overflow-x-auto pb-1">
          <div className="flex items-center gap-2 min-w-max">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Şagird, valideyn, nömrə, qrup və ya bölmə axtar..."
              className="w-[320px] shrink-0"
            />
            <Select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              options={divisionOptions}
              className="w-52 shrink-0"
            />
            <Select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              options={groupOptions}
              className="w-52 shrink-0"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              options={[
                { value: 'all', label: 'Bütün statuslar' },
                { value: 'active', label: 'Aktiv' },
                { value: 'inactive', label: 'Deaktiv' },
              ]}
              className="w-44 shrink-0"
            />
            <Select
              value={paymentDayFilter}
              onChange={(e) => setPaymentDayFilter(e.target.value)}
              options={paymentDayOptions}
              className="w-52 shrink-0"
            />
            <Select
              value={discountFilter}
              onChange={(e) => setDiscountFilter(e.target.value as DiscountFilter)}
              options={[
                { value: 'all', label: 'Bütün (Endirim)' },
                { value: 'has_discount', label: 'Endirimli' },
                { value: 'no_discount', label: 'Endirimsiz' },
              ]}
              className="w-44 shrink-0"
            />
            <div className="flex bg-gray-50 dark:bg-gray-800/40 p-1 rounded-xl border border-gray-100 dark:border-gray-700/50 min-h-[42px] shrink-0 w-[280px]">
              <button
                onClick={() => setScheduleFilter('all')}
                className={cn(
                  'flex-[1.35] flex items-center justify-center px-1.5 rounded-lg text-[11px] leading-tight font-medium transition-all',
                  scheduleFilter === 'all'
                    ? 'bg-white text-gray-800 shadow-sm border border-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                Bütün qrafiklər
              </button>
              <button
                onClick={() => setScheduleFilter('FullDay')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 px-1.5 rounded-lg text-[12px] font-medium transition-all',
                  scheduleFilter === 'FullDay'
                    ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                Tam
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                  scheduleFilter === 'FullDay' ? 'bg-amber-200/60 text-amber-800 dark:bg-amber-800/60 dark:text-amber-200' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                )}>{fullDayCount}</span>
              </button>
              <button
                onClick={() => setScheduleFilter('HalfDay')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 px-1.5 rounded-lg text-[12px] font-medium transition-all',
                  scheduleFilter === 'HalfDay'
                    ? 'bg-violet-100 text-violet-700 shadow-sm border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                Yarım
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                  scheduleFilter === 'HalfDay' ? 'bg-violet-200/60 text-violet-800 dark:bg-violet-800/60 dark:text-violet-200' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                )}>{halfDayCount}</span>
              </button>
            </div>
            <Select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              options={[
                { value: 'all', label: 'Ümumi siyahı' },
                { value: 'grouped', label: 'Qruplar üzrə' },
              ]}
              className="w-44 shrink-0"
            />

            {viewMode === 'all' ? (
              <Select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                options={[
                  { value: 'debt-desc', label: 'Borc çoxdan aza' },
                  { value: 'debt-asc', label: 'Borc azdan çoxa' },
                  { value: 'name-asc', label: 'Ad A-Z' },
                  { value: 'name-desc', label: 'Ad Z-A' },
                ]}
                className="w-48 shrink-0"
              />
            ) : (
              <Select
                value={groupSortMode}
                onChange={(e) => setGroupSortMode(e.target.value as GroupSortMode)}
                options={[
                  { value: 'debt-desc', label: 'Qrup borcu çoxdan aza' },
                  { value: 'debt-asc', label: 'Qrup borcu azdan çoxa' },
                  { value: 'count-desc', label: 'Şagird sayı çoxdan aza' },
                  { value: 'count-asc', label: 'Şagird sayı azdan çoxa' },
                  { value: 'name-asc', label: 'Qrup A-Z' },
                ]}
                className="w-56 shrink-0"
              />
            )}
          </div>
        </div>

        {(search || divisionFilter !== 'all' || groupFilter !== 'all' || statusFilter !== 'all' || paymentDayFilter !== 'all' || scheduleFilter !== 'all') && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-gray-400">Aktiv filter:</span>
            {search && (
              <button onClick={() => setSearch('')} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
                Axtarış: {search} ×
              </button>
            )}
            {divisionFilter !== 'all' && (
              <button onClick={() => setDivisionFilter('all')} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100">
                Bölmə: {divisionFilter} ×
              </button>
            )}
            {groupFilter !== 'all' && (
              <button onClick={() => setGroupFilter('all')} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100">
                Qrup: {groupFilter} ×
              </button>
            )}
            {statusFilter !== 'all' && (
              <button onClick={() => setStatusFilter('all')} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
                Status: {statusFilter === 'active' ? 'Aktiv' : 'Deaktiv'} ×
              </button>
            )}
            {paymentDayFilter !== 'all' && (
              <button onClick={() => setPaymentDayFilter('all')} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                Ödəniş günü: {paymentDayFilter} ×
              </button>
            )}
            {scheduleFilter !== 'all' && (
              <button onClick={() => setScheduleFilter('all')} className={cn(
                'px-2 py-0.5 rounded-full',
                scheduleFilter === 'FullDay' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
              )}>
                {scheduleFilter === 'FullDay' ? 'Tam günlük' : 'Yarım günlük'} ×
              </button>
            )}
            {discountFilter !== 'all' && (
              <button onClick={() => setDiscountFilter('all')} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100">
                {discountFilter === 'has_discount' ? 'Endirimli' : 'Endirimsiz'} ×
              </button>
            )}
            <button
              onClick={() => {
                setSearch('');
                setDivisionFilter('all');
                setGroupFilter('all');
                setStatusFilter('all');
                setPaymentDayFilter('all');
                setScheduleFilter('all');
                setDiscountFilter('all');
              }}
              className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100"
            >
              Hamısını sıfırla
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : viewMode === 'all' ? (
        filteredRows.length === 0 ? (
          <EmptyState
            icon={<Filter size={26} />}
            title="Siyahı tapılmadı"
            description="Filterlərə uyğun nəticə yoxdur."
          />
        ) : (
          <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700/40">
                    <th className="text-left px-4 py-3 text-gray-500">Şagird</th>
                    <th className="text-left px-4 py-3 text-gray-500 hidden md:table-cell">Valideyn ad soyad</th>
                    <th className="text-left px-4 py-3 text-gray-500 hidden lg:table-cell">Valideyn əlaqə nömrəsi</th>
                    <th className="text-left px-4 py-3 text-gray-500 hidden xl:table-cell">Bölmə</th>
                    <th className="text-left px-4 py-3 text-gray-500">Qrup</th>
                    <th className="text-left px-4 py-3 text-gray-500 hidden lg:table-cell">Ödəniş günü</th>
                    <th className="text-left px-4 py-3 text-gray-500 hidden xl:table-cell">Aylıq ödəniş</th>
                    <th className="text-left px-4 py-3 text-gray-500">Qalıq borc</th>
                    <th className="text-left px-4 py-3 text-gray-500 hidden 2xl:table-cell">Ödənilməmiş aylar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                  {filteredRows.map((r) => (
                    <tr key={r.childId} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-gray-800 dark:text-gray-100">
                        <Link href={`/children/${r.childId}`} className="hover:text-green-600 transition-colors underline-offset-2 hover:underline">
                          {r.childFullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 hidden md:table-cell">{r.parentFullName}</td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={13} className="text-gray-400" /> {r.parentPhone}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        <Badge variant="blue" size="sm">{r.divisionName}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{r.groupName}</td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 hidden lg:table-cell">{r.paymentDay || '-'}</td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 hidden xl:table-cell whitespace-nowrap">
                        <span>{formatCurrency(r.monthlyFee || 0)}</span>
                        {r.discountPercentage && r.discountPercentage > 0 ? (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200/60 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50 align-text-bottom">
                            -{r.discountPercentage}%
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-rose-600">{formatCurrency(r.totalDebt)}</td>
                      <td className="px-4 py-3.5 text-gray-500 hidden 2xl:table-cell">{fmtMonths(r.unpaidMonths) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        groupedRows.length === 0 ? (
          <EmptyState
            icon={<Layers size={26} />}
            title="Qrup nəticəsi yoxdur"
            description="Filterlərə uyğun qrup tapılmadı."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupedRows.map((g) => (
              <div
                key={g.key}
                className={cn(
                  'bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4',
                  'hover:shadow-md transition-shadow'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{g.groupName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{g.divisionName}</p>
                  </div>
                  <Badge variant="teal" size="sm">{g.childCount} şagird</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600 dark:text-gray-300">
                    Ümumi qalıq borc: <span className="font-semibold text-rose-600">{formatCurrency(g.totalDebt)}</span>
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">Orta borc: {formatCurrency(g.avgDebt)}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <div className="text-xs text-gray-400 flex items-center gap-2">
        <ListChecks size={13} />
        Excel faylında iki səhifə yaradılır: SagirdSiyahisi və QruplarUzre.
      </div>
    </div>
  );
}
