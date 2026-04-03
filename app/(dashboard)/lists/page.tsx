'use client';

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
import { paymentsApi } from '@/lib/api/payments';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/constants';
import { useAuth } from '@/lib/hooks/useAuth';
import type { DebtorInfo } from '@/types';

type ViewMode = 'all' | 'grouped';
type SortMode = 'debt-desc' | 'debt-asc' | 'name-asc' | 'name-desc';
type GroupSortMode = 'debt-desc' | 'debt-asc' | 'count-desc' | 'count-asc' | 'name-asc';

interface GroupDebtRow {
  key: string;
  groupName: string;
  divisionName: string;
  childCount: number;
  totalDebt: number;
  avgDebt: number;
}

function fmtMonths(months: number[]) {
  return months
    .slice()
    .sort((a, b) => a - b)
    .map((m) => String(m).padStart(2, '0'))
    .join(', ');
}

async function exportDebtWorkbook(rows: DebtorInfo[], grouped: GroupDebtRow[], fileName: string) {
  const XLSX = await import('xlsx');

  const detailData = rows.map((r, i) => ({
    No: i + 1,
    Sagird: r.childFullName,
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
  const [rows, setRows] = useState<DebtorInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('debt-desc');
  const [groupSortMode, setGroupSortMode] = useState<GroupSortMode>('debt-desc');

  useEffect(() => {
    paymentsApi
      .getDebtors({ silentError: true })
      .then(setRows)
      .catch(() => {
        setRows([]);
        toast.error('Siyahı yüklənmədi');
      })
      .finally(() => setLoading(false));
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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = rows.filter((r) => {
      if (divisionFilter !== 'all' && r.divisionName !== divisionFilter) return false;
      if (groupFilter !== 'all' && r.groupName !== groupFilter) return false;
      if (!q) return true;

      return (
        r.childFullName.toLowerCase().includes(q)
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
  }, [rows, divisionFilter, groupFilter, search, sortMode]);

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

  const totalDebt = filteredRows.reduce((sum, r) => sum + r.totalDebt, 0);

  const handleExportFiltered = async () => {
    try {
      await exportDebtWorkbook(filteredRows, groupedRows, 'sagird_siyahi_filtered.xlsx');
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Şagird, nömrə, qrup və ya bölmə axtar..."
            className="sm:max-w-sm"
          />
          <Select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            options={divisionOptions}
            className="sm:w-52"
          />
          <Select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            options={groupOptions}
            className="sm:w-52"
          />
          <Select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            options={[
              { value: 'all', label: 'Ümumi siyahı' },
              { value: 'grouped', label: 'Qruplar üzrə' },
            ]}
            className="sm:w-44"
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
              className="sm:w-48"
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
              className="sm:w-56"
            />
          )}
        </div>

        {(search || divisionFilter !== 'all' || groupFilter !== 'all') && (
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
            <button
              onClick={() => {
                setSearch('');
                setDivisionFilter('all');
                setGroupFilter('all');
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
                    <th className="text-left px-4 py-3 text-gray-500 hidden md:table-cell">Valideyn əlaqə nömrəsi</th>
                    <th className="text-left px-4 py-3 text-gray-500 hidden lg:table-cell">Bölmə</th>
                    <th className="text-left px-4 py-3 text-gray-500">Qrup</th>
                    <th className="text-left px-4 py-3 text-gray-500">Qalıq borc</th>
                    <th className="text-left px-4 py-3 text-gray-500 hidden xl:table-cell">Ödənilməmiş aylar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                  {filteredRows.map((r) => (
                    <tr key={r.childId} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-gray-800 dark:text-gray-100">{r.childFullName}</td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={13} className="text-gray-400" /> {r.parentPhone}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <Badge variant="blue" size="sm">{r.divisionName}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{r.groupName}</td>
                      <td className="px-4 py-3.5 font-semibold text-rose-600">{formatCurrency(r.totalDebt)}</td>
                      <td className="px-4 py-3.5 text-gray-500 hidden xl:table-cell">{fmtMonths(r.unpaidMonths) || '-'}</td>
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
