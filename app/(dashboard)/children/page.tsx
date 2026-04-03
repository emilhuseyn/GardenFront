'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, LayoutGrid, List, Users } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { ChildCard } from '@/components/children/ChildCard';
import { ChildTable } from '@/components/children/ChildTable';
import { cn } from '@/lib/utils/constants';
import { childrenApi } from '@/lib/api/children';
import { divisionsApi, groupsApi } from '@/lib/api/groups';
import { reportsApi } from '@/lib/api/reports';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { equalsNormalizedText, getAge } from '@/lib/utils/format';
import { toast } from 'sonner';
import type { ActiveInactive, Child, ChildFilters, Division, Group } from '@/types';

const STATUS_OPTIONS = [
  { value: '', label: 'Bütün statuslar' },
  { value: 'Active', label: 'Aktiv' },
  { value: 'Inactive', label: 'Qeyri-aktiv' },
];

const SCHEDULE_OPTIONS = [
  { value: '', label: 'Bütün qrafiklər' },
  { value: 'FullDay', label: 'Tam günlük' },
  { value: 'HalfDay', label: 'Yarım günlük' },
];

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Ad (A-Z)' },
  { value: 'name_desc', label: 'Ad (Z-A)' },
  { value: 'age_desc', label: 'Yaş (böyükdən kiçiyə)' },
  { value: 'age_asc', label: 'Yaş (kiçikdən böyüyə)' },
  { value: 'fee_desc', label: 'Aylıq ödəniş (çoxdan aza)' },
  { value: 'fee_asc', label: 'Aylıq ödəniş (azdan çoxa)' },
  { value: 'status', label: 'Status (aktivlər əvvəl)' },
];

export default function ChildrenPage() {
  const [view, setViewInternal]     = useState<'grid' | 'table'>('grid');
  const [search, setSearch]         = useState('');
  const [divFilter, setDivFilter]   = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [schedFilter, setSched]     = useState('');
  const [ageMin, setAgeMin]         = useState('');
  const [ageMax, setAgeMax]         = useState('');
  const [feeMin, setFeeMin]         = useState('');
  const [feeMax, setFeeMax]         = useState('');
  const [payDayMin, setPayDayMin]   = useState('');
  const [payDayMax, setPayDayMax]   = useState('');
  const [sortBy, setSortBy]         = useState('name_asc');
  const [children, setChildren]     = useState<Child[]>([]);
  const [loading, setLoading]       = useState(true);
  const [divisions, setDivisions]   = useState<Division[]>([]);
  const [groups, setGroups]         = useState<Group[]>([]);
  const [summary, setSummary]       = useState<ActiveInactive | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<Child[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const setView = (v: 'grid' | 'table') => {
    setViewInternal(v);
    localStorage.setItem('kg_children_view', v);
  };

  useEffect(() => {
    const saved = localStorage.getItem('kg_children_view');
    if (saved === 'grid' || saved === 'table') {
      setViewInternal(saved);
    }
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      const data = await reportsApi.getActiveInactive();
      setSummary(data);
    } catch {
      // keep UI responsive even if summary endpoint fails
    }
  }, []);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  const handleDeleteRequest = (id: number) => {
    const child = children.find((c) => c.id === id);
    if (child) setDeleteTargets([child]);
  };

  const handleDeleteBulkRequest = (ids: number[]) => {
    const targets = children.filter((c) => ids.includes(c.id));
    if (targets.length) setDeleteTargets(targets);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargets.length) return;
    setDeleteLoading(true);
    try {
      for (const target of deleteTargets) {
        await childrenApi.delete(target.id);
      }
      toast.success(deleteTargets.length > 1 ? `${deleteTargets.length} uşaq silindi` : 'Uşaq silindi');
      const deletedIds = new Set(deleteTargets.map((c) => c.id));
      setChildren((prev) => {
        const updated = prev.filter((c) => !deletedIds.has(c.id));
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith('children_cache_'))
          .forEach((k) => sessionStorage.removeItem(k));
        return updated;
      });
      void refreshSummary();
      setDeleteTargets([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Silinmə xətası');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      if (currentStatus === 'Active') {
        await childrenApi.deactivate(id);
        toast.success('Uşaq deaktiv edildi');
      } else {
        await childrenApi.activate(id);
        toast.success('Uşaq aktiv edildi');
      }
      setChildren((prev) => {
        const updated = prev.map((c) =>
          c.id === id
            ? { ...c, status: (currentStatus === 'Active' ? 'Inactive' : 'Active') as import('@/types').ChildStatus }
            : c
        );
        // Invalidate all children caches so next load is fresh
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith('children_cache_'))
          .forEach((k) => sessionStorage.removeItem(k));
        return updated;
      });
      void refreshSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xəta baş verdi, adminlə əlaqə saxlayın');
    }
  };

  useEffect(() => {
    Promise.all([divisionsApi.getAll(), groupsApi.getAll()])
      .then(([divisionData, groupData]) => {
        setDivisions(divisionData);
        setGroups(groupData);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const cacheKey = `children_cache_${debouncedSearch.trim()}_${divFilter}_${statusFilter}_${schedFilter}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setChildren(JSON.parse(cached));
        setLoading(false);
      } catch { /* ignore invalid cache */ }
    } else {
      setLoading(true);
    }

    const run = async () => {
      try {
        if (debouncedSearch.trim()) {
          const results = await childrenApi.search(debouncedSearch.trim());
          setChildren(results);
          sessionStorage.setItem(cacheKey, JSON.stringify(results));
        } else {
          const baseFilters: ChildFilters = {
            divisionId:   divFilter ? Number(divFilter) : undefined,
            scheduleType: schedFilter !== '' ? (schedFilter as 'FullDay' | 'HalfDay') : undefined,
          };

          const fetchAllPages = async (filters: ChildFilters) => {
            const pageSize = 0;
            const firstPage = await childrenApi.getAll({ ...filters, page: 1, pageSize });
            let allItems = [...firstPage.items];

            if (firstPage.hasNextPage || firstPage.totalPages > 1) {
              const totalPages = Math.max(firstPage.totalPages || 1, 1);
              for (let page = 2; page <= totalPages; page += 1) {
                const nextPage = await childrenApi.getAll(
                  { ...filters, page, pageSize },
                  { silentError: true }
                );
                allItems = allItems.concat(nextPage.items);
              }
            }

            return allItems;
          };

          const selectedStatus = (statusFilter as 'Active' | 'Inactive' | '') || undefined;

          let allItems: Child[];
          if (selectedStatus) {
            allItems = await fetchAllPages({ ...baseFilters, status: selectedStatus });
          } else {
            const [activeItems, inactiveItems] = await Promise.all([
              fetchAllPages({ ...baseFilters, status: 'Active' }),
              fetchAllPages({ ...baseFilters, status: 'Inactive' }),
            ]);
            allItems = activeItems.concat(inactiveItems);
          }

          // Keep latest item per id in case backend pages overlap.
          const uniqueItems = Array.from(new Map(allItems.map((child) => [child.id, child])).values());

          setChildren(uniqueItems);
          sessionStorage.setItem(cacheKey, JSON.stringify(uniqueItems));
        }
      } catch {
        if (!cached) setChildren([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [debouncedSearch, divFilter, statusFilter, schedFilter]);

  const divisionOptions = [
    { value: '', label: 'Bütün bölmələr' },
    ...divisions.map((d) => ({ value: String(d.id), label: d.name })),
  ];

  const groupOptions = [
    { value: '', label: 'Bütün qruplar' },
    ...Array.from(new Map(groups.map((g) => [g.name, g])).values())
      .sort((a, b) => a.name.localeCompare(b.name, 'az'))
      .map((g) => ({ value: g.name, label: g.name })),
  ];

  const clearAllFilters = () => {
    setSearch('');
    setDivFilter('');
    setGroupFilter('');
    setStatus('');
    setSched('');
    setAgeMin('');
    setAgeMax('');
    setFeeMin('');
    setFeeMax('');
    setPayDayMin('');
    setPayDayMax('');
    setSortBy('name_asc');
  };

  const processedChildren = useMemo(() => {
    const selectedDivisionName = divFilter
      ? divisions.find((d) => String(d.id) === divFilter)?.name
      : undefined;

    const minAge = ageMin.trim() !== '' ? Number(ageMin) : undefined;
    const maxAge = ageMax.trim() !== '' ? Number(ageMax) : undefined;
    const minFee = feeMin.trim() !== '' ? Number(feeMin) : undefined;
    const maxFee = feeMax.trim() !== '' ? Number(feeMax) : undefined;
    const minPayDay = payDayMin.trim() !== '' ? Number(payDayMin) : undefined;
    const maxPayDay = payDayMax.trim() !== '' ? Number(payDayMax) : undefined;

    const filtered = children.filter((child) => {
      const childAge = getAge(child.dateOfBirth);

      if (selectedDivisionName && !equalsNormalizedText(child.divisionName, selectedDivisionName)) return false;
      if (groupFilter && !equalsNormalizedText(child.groupName, groupFilter)) return false;
      if (statusFilter && child.status !== statusFilter) return false;
      if (schedFilter === 'FullDay' && child.scheduleType !== 'FullDay') return false;
      if (schedFilter === 'HalfDay' && child.scheduleType !== 'HalfDay') return false;
      if (minAge !== undefined && Number.isFinite(minAge) && childAge < minAge) return false;
      if (maxAge !== undefined && Number.isFinite(maxAge) && childAge > maxAge) return false;
      if (minFee !== undefined && Number.isFinite(minFee) && child.monthlyFee < minFee) return false;
      if (maxFee !== undefined && Number.isFinite(maxFee) && child.monthlyFee > maxFee) return false;
      if (minPayDay !== undefined && Number.isFinite(minPayDay) && child.paymentDay < minPayDay) return false;
      if (maxPayDay !== undefined && Number.isFinite(maxPayDay) && child.paymentDay > maxPayDay) return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.trim();
      const nameB = `${b.firstName} ${b.lastName}`.trim();

      switch (sortBy) {
        case 'name_desc':
          return nameB.localeCompare(nameA, 'az');
        case 'age_desc':
          return getAge(b.dateOfBirth) - getAge(a.dateOfBirth);
        case 'age_asc':
          return getAge(a.dateOfBirth) - getAge(b.dateOfBirth);
        case 'fee_desc':
          return b.monthlyFee - a.monthlyFee;
        case 'fee_asc':
          return a.monthlyFee - b.monthlyFee;
        case 'status': {
          if (a.status === b.status) return nameA.localeCompare(nameB, 'az');
          return a.status === 'Active' ? -1 : 1;
        }
        case 'name_asc':
        default:
          return nameA.localeCompare(nameB, 'az');
      }
    });

    return sorted;
  }, [
    children,
    divisions,
    divFilter,
    groupFilter,
    statusFilter,
    schedFilter,
    ageMin,
    ageMax,
    feeMin,
    feeMax,
    payDayMin,
    payDayMax,
    sortBy,
  ]);

  const activeCount   = summary?.activeCount ?? processedChildren.filter((c) => c.status === 'Active').length;
  const inactiveCount = summary?.inactiveCount ?? processedChildren.filter((c) => c.status !== 'Active').length;
  const totalShown    = summary ? summary.activeCount + summary.inactiveCount : processedChildren.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uşaqlar"
        description="Qeydiyyatda olan bütün uşaqların siyahısı"
        actions={
          <Link href="/children/new">
            <Button>
              <Plus size={16} /> Uşaq əlavə et
            </Button>
          </Link>
        }
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="green"  size="sm">{activeCount} aktiv</Badge>
            {inactiveCount > 0 && <Badge variant="gray" size="sm">{inactiveCount} qeyri-aktiv</Badge>}
            <Badge variant="blue"   size="sm">{totalShown} ümumi</Badge>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Ad, soyad və ya telefon axtar..."
            className="sm:max-w-xs"
          />
          <Select value={divFilter} onChange={(e) => setDivFilter(e.target.value)} options={divisionOptions} className="sm:w-44" />
          <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} options={groupOptions} className="sm:w-44" />
          <Select value={statusFilter} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} className="sm:w-40" />
          <Select value={schedFilter}  onChange={(e) => setSched(e.target.value)}  options={SCHEDULE_OPTIONS} className="sm:w-44" />
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={SORT_OPTIONS} className="sm:w-60" />
          <div className="flex items-center gap-1 ml-auto bg-gray-50 dark:bg-gray-800/60 rounded-lg p-1">
            <button
              onClick={() => setView('grid')}
              className={cn('p-2 rounded-md transition-all', view === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600' : 'text-gray-400 dark:text-gray-500')}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('table')}
              className={cn('p-2 rounded-md transition-all', view === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600' : 'text-gray-400 dark:text-gray-500')}
            >
              <List size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-3 pt-3 border-t border-white-border dark:border-gray-700/60">
          <Input
            type="number"
            min={1}
            value={ageMin}
            onChange={(e) => setAgeMin(e.target.value)}
            placeholder="Yaş min"
            inputSize="sm"
          />
          <Input
            type="number"
            min={1}
            value={ageMax}
            onChange={(e) => setAgeMax(e.target.value)}
            placeholder="Yaş max"
            inputSize="sm"
          />
          <Input
            type="number"
            min={0}
            value={feeMin}
            onChange={(e) => setFeeMin(e.target.value)}
            placeholder="Ödəniş min (₼)"
            inputSize="sm"
          />
          <Input
            type="number"
            min={0}
            value={feeMax}
            onChange={(e) => setFeeMax(e.target.value)}
            placeholder="Ödəniş max (₼)"
            inputSize="sm"
          />
          <Input
            type="number"
            min={1}
            max={28}
            value={payDayMin}
            onChange={(e) => setPayDayMin(e.target.value)}
            placeholder="Ödəniş günü min"
            inputSize="sm"
          />
          <Input
            type="number"
            min={1}
            max={28}
            value={payDayMax}
            onChange={(e) => setPayDayMax(e.target.value)}
            placeholder="Ödəniş günü max"
            inputSize="sm"
          />
        </div>
        {(divFilter || groupFilter || statusFilter || schedFilter || ageMin || ageMax || feeMin || feeMax || payDayMin || payDayMax || sortBy !== 'name_asc') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white-border dark:border-gray-700/60">
            <span className="text-xs text-gray-400">Aktiv filter:</span>
            {divFilter && (
              <button onClick={() => setDivFilter('')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded-full hover:bg-green-100">
                {divisions.find((d) => String(d.id) === divFilter)?.name ?? divFilter} ×
              </button>
            )}
            {groupFilter && (
              <button onClick={() => setGroupFilter('')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100">
                Qrup: {groupFilter} ×
              </button>
            )}
            {statusFilter && (
              <button onClick={() => setStatus('')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100">
                {statusFilter === 'Active' ? 'Aktiv' : 'Qeyri-aktiv'} ×
              </button>
            )}
            {schedFilter && (
              <button onClick={() => setSched('')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100">
                {schedFilter === 'FullDay' ? 'Tam günlük' : 'Yarım günlük'} ×
              </button>
            )}
            {sortBy !== 'name_asc' && (
              <button onClick={() => setSortBy('name_asc')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-violet-50 text-violet-700 rounded-full hover:bg-violet-100">
                Sıralama: {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? 'Ad (A-Z)'} ×
              </button>
            )}
            {ageMin && (
              <button onClick={() => setAgeMin('')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-cyan-50 text-cyan-700 rounded-full hover:bg-cyan-100">
                Yaş min: {ageMin} ×
              </button>
            )}
            {ageMax && (
              <button onClick={() => setAgeMax('')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-cyan-50 text-cyan-700 rounded-full hover:bg-cyan-100">
                Yaş max: {ageMax} ×
              </button>
            )}
            {feeMin && (
              <button onClick={() => setFeeMin('')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100">
                Ödəniş min: ₼{feeMin} ×
              </button>
            )}
            {feeMax && (
              <button onClick={() => setFeeMax('')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100">
                Ödəniş max: ₼{feeMax} ×
              </button>
            )}
            {payDayMin && (
              <button onClick={() => setPayDayMin('')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-fuchsia-50 text-fuchsia-700 rounded-full hover:bg-fuchsia-100">
                Gün min: {payDayMin} ×
              </button>
            )}
            {payDayMax && (
              <button onClick={() => setPayDayMax('')} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-fuchsia-50 text-fuchsia-700 rounded-full hover:bg-fuchsia-100">
                Gün max: {payDayMax} ×
              </button>
            )}
            <button
              onClick={clearAllFilters}
              className="ml-auto px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
            >
              Hamısını sıfırla
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1e2130] rounded-2xl border dark:border-gray-700/60 p-4">
              <Skeleton className="h-12 w-12 rounded-full mb-3" />
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : processedChildren.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="Uşaq tapılmadı"
          description="Axtarış kriteriyalarınıza uyğun uşaq yoxdur."
          action={{ label: 'Filterləri sıfırla', onClick: clearAllFilters }}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {processedChildren.map((child, i) => (
            <motion.div
              key={child.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
              <Link href={`/children/${child.id}`}>
                <ChildCard
                  child={child}
                  index={i}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDeleteRequest}
                />
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <ChildTable rows={processedChildren} onToggleStatus={handleToggleStatus} onDelete={handleDeleteRequest} onDeleteBulk={handleDeleteBulkRequest} />
      )}

      <ConfirmDeleteModal
        open={deleteTargets.length > 0}
        onClose={() => setDeleteTargets([])}
        onConfirm={handleDeleteConfirm}
        childName={
          deleteTargets.length === 1
            ? `${deleteTargets[0].firstName} ${deleteTargets[0].lastName}`
            : `${deleteTargets.length} uşaq`
        }
        loading={deleteLoading}
      />
    </div>
  );
}
