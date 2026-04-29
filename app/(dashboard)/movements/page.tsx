'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { BarChart } from '@/components/charts/BarChart';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/dashboard/StatCard';
import { childrenApi } from '@/lib/api/children';
import { divisionsApi, groupsApi } from '@/lib/api/groups';
import { equalsNormalizedText, formatDate, formatMonthYear } from '@/lib/utils/format';
import type { Child, ChildFilters, Division, Group } from '@/types';
import { UserMinus, UserPlus, Users, ArrowUpRight, ArrowDownRight, Activity, TrendingUp, ChevronRight } from 'lucide-react';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: formatMonthYear(i + 1, new Date().getFullYear()).split(' ')[0],
}));

const YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: String(year) };
});

export default function MovementsPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [trendRange, setTrendRange] = useState('12');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    let active = true;

    const fetchAllPages = async (filters: ChildFilters) => {
      const pageSize = 0;
      const firstPage = await childrenApi.getAll({ ...filters, page: 1, pageSize }, { silentError: true });
      let allItems = [...firstPage.items];

      if (firstPage.hasNextPage || firstPage.totalPages > 1) {
        const totalPages = Math.max(firstPage.totalPages || 1, 1);
        for (let page = 2; page <= totalPages; page += 1) {
          const nextPage = await childrenApi.getAll({ ...filters, page, pageSize }, { silentError: true });
          allItems = allItems.concat(nextPage.items);
        }
      }

      return allItems;
    };

    const run = async () => {
      try {
        const [activeItems, inactiveItems] = await Promise.all([
          fetchAllPages({ status: 'Active' }),
          fetchAllPages({ status: 'Inactive' }),
        ]);

        const uniqueItems = Array.from(new Map([...activeItems, ...inactiveItems].map((c) => [c.id, c])).values());
        if (active) setChildren(uniqueItems);
      } catch {
        if (active) setChildren([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([divisionsApi.getAll(), groupsApi.getAll()])
      .then(([divisionData, groupData]) => {
        if (!active) return;
        setDivisions(divisionData);
        setGroups(groupData);
      })
      .catch(() => {})
      .finally(() => {});

    return () => {
      active = false;
    };
  }, []);

  const monthStart = useMemo(() => new Date(Number(year), Number(month) - 1, 1), [year, month]);
  const monthEnd = useMemo(() => new Date(Number(year), Number(month), 1), [year, month]);

  const isInMonth = useCallback((value?: string | null) => {
    if (!value) return false;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed >= monthStart && parsed < monthEnd;
  }, [monthEnd, monthStart]);

  const selectedDivisionName = divisionFilter
    ? divisions.find((d) => String(d.id) === divisionFilter)?.name
    : undefined;
  const selectedGroupName = groupFilter
    ? groups.find((g) => String(g.id) === groupFilter)?.name
    : undefined;

  const filteredChildren = useMemo(
    () => children.filter((c) => {
      if (selectedDivisionName && !equalsNormalizedText(c.divisionName, selectedDivisionName)) return false;
      if (selectedGroupName && !equalsNormalizedText(c.groupName, selectedGroupName)) return false;
      return true;
    }),
    [children, selectedDivisionName, selectedGroupName]
  );

  const joined = useMemo(
    () => filteredChildren.filter((c) => isInMonth(c.registrationDate)).sort((a, b) => {
      const aDate = new Date(a.registrationDate ?? 0).getTime();
      const bDate = new Date(b.registrationDate ?? 0).getTime();
      return bDate - aDate;
    }),
    [filteredChildren, isInMonth]
  );

  const left = useMemo(
    () => filteredChildren.filter((c) => isInMonth(c.deactivationDate)).sort((a, b) => {
      const aDate = new Date(a.deactivationDate ?? 0).getTime();
      const bDate = new Date(b.deactivationDate ?? 0).getTime();
      return bDate - aDate;
    }),
    [filteredChildren, isInMonth]
  );

  const activeCount = useMemo(
    () => filteredChildren.filter((c) => c.status === 'Active').length,
    [filteredChildren]
  );

  const trendMonths = useMemo(() => {
    const count = Math.max(1, Number(trendRange) || 12);
    const base = new Date(Number(year), Number(month) - 1, 1);
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (count - 1 - i), 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    });
  }, [month, year, trendRange]);

  const trendData = useMemo(() => {
    return trendMonths.map((entry) => {
      const start = new Date(entry.year, entry.month - 1, 1);
      const end = new Date(entry.year, entry.month, 1);
      const joinCount = filteredChildren.filter((c) => {
        if (!c.registrationDate) return false;
        const d = new Date(c.registrationDate);
        return !Number.isNaN(d.getTime()) && d >= start && d < end;
      }).length;
      const leaveCount = filteredChildren.filter((c) => {
        if (!c.deactivationDate) return false;
        const d = new Date(c.deactivationDate);
        return !Number.isNaN(d.getTime()) && d >= start && d < end;
      }).length;

      return {
        name: formatMonthYear(entry.month, entry.year),
        joined: joinCount,
        left: leaveCount,
      };
    });
  }, [filteredChildren, trendMonths]);

  const divisionOptions = useMemo(
    () => [
      { value: '', label: 'Bütün bölmələr' },
      ...divisions.map((d) => ({ value: String(d.id), label: d.name })),
    ],
    [divisions]
  );

  const groupOptions = useMemo(() => {
    const base = divisionFilter
      ? groups.filter((g) => String(g.divisionId) === divisionFilter)
      : groups;
    return [
      { value: '', label: 'Bütün qruplar' },
      ...base
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'az'))
        .map((g) => ({ value: String(g.id), label: g.name })),
    ];
  }, [groups, divisionFilter]);

  const selectedMonthLabel = formatMonthYear(Number(month), Number(year));

  return (
    <div className="gradient-mesh min-h-full">
      <div className="space-y-8 max-w-7xl mx-auto pb-10">
        <PageHeader
          title="Daxilolma və Ayrılma"
          description="Tədris mərkəzi üzrə tələbə hərəkətinin aylıq icmalı"
          badge={
            <span className="inline-flex items-center rounded-full bg-white/80 dark:bg-[#1e2130]/80 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 border border-white-border/70 dark:border-gray-700/60">
              {selectedMonthLabel}
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2 bg-white/90 dark:bg-[#1e2130]/80 backdrop-blur p-1 rounded-xl border border-white-border dark:border-gray-700/60 shadow-sm">
              <div className="w-28">
                <Select value={month} onChange={(e) => setMonth(e.target.value)} options={MONTH_OPTIONS} className="h-9 text-xs shadow-sm" />
              </div>
              <div className="w-20">
                <Select value={year} onChange={(e) => setYear(e.target.value)} options={YEAR_OPTIONS} className="h-9 text-xs shadow-sm" />
              </div>
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700/60 mx-0.5" />
              <div className="w-28">
                <Select
                  value={trendRange}
                  onChange={(e) => setTrendRange(e.target.value)}
                  options={[
                    { value: '6', label: 'Son 6 ay' },
                    { value: '12', label: 'Son 12 ay' },
                  ]}
                  className="h-9 text-xs shadow-sm"
                />
              </div>
            </div>
          }
        />

        <Card padding="md" className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white/90 dark:bg-[#1e2130]/85 border border-white-border/70 dark:border-gray-700/60">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <Activity size={14} />
            Filtrlər
          </div>
          <Select value={divisionFilter} onChange={(e) => {
            setDivisionFilter(e.target.value);
            setGroupFilter('');
          }} options={divisionOptions} className="w-full sm:w-64" />
          <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} options={groupOptions} className="w-full sm:w-64" />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="md">
                <Skeleton className="w-10 h-10 rounded-xl mb-3" />
                <Skeleton className="h-7 w-20 mb-2" />
                <Skeleton className="h-4 w-28" />
              </Card>
            ))
          ) : (
            <>
              <StatCard
                title="Daxil olan tələbələr"
                value={joined.length}
                icon={UserPlus}
                accentColor="#34C47E"
                bgColor="#EDFAF3"
                iconColor="#22A965"
                delay={0}
              />
              <StatCard
                title="Ayrılan tələbələr"
                value={left.length}
                icon={UserMinus}
                accentColor="#F56565"
                bgColor="#FFF0F0"
                iconColor="#F56565"
                delay={0.05}
              />
              <StatCard
                title="Aktiv tələbə sayı"
                value={activeCount}
                icon={Users}
                accentColor="#4A90D9"
                bgColor="#EBF4FF"
                iconColor="#4A90D9"
                delay={0.1}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <Card padding="lg" className="h-full">
              <CardHeader className="items-start gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="text-blue-500" size={18} />
                    Qeydiyyat Trendi
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Son {trendRange} ay ərzində tələbə qeydiyyatı və ayrılma statistikası
                  </p>
                </div>
                <div className="hidden sm:flex flex-col gap-1.5 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-sm"></span>
                    <span className="text-gray-600 dark:text-gray-300">Yeni qeydiyyat</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-sm"></span>
                    <span className="text-gray-600 dark:text-gray-300">Ayrılanlar</span>
                  </div>
                </div>
              </CardHeader>
              {loading ? (
                <Skeleton className="h-[320px] w-full rounded-2xl" />
              ) : (
                <div className="h-[320px]">
                  <BarChart
                    data={trendData}
                    dataKey="joined"
                    secondDataKey="left"
                    color="#10b981"
                    secondColor="#f43f5e"
                    label="Daxil olan"
                    secondLabel="Ayrılan"
                    height={320}
                  />
                </div>
              )}
            </Card>
          </div>

          <Card padding="lg" className="flex flex-col h-full border-t-2 border-t-emerald-500">
            <CardHeader className="mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <ArrowDownRight className="text-emerald-500" size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Yeni qeydiyyatlar</CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{selectedMonthLabel}</p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full text-emerald-600 dark:text-emerald-400">
                {joined.length}
              </span>
            </CardHeader>

            <div className="flex-1">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                    </div>
                  ))}
                </div>
              ) : joined.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 bg-gray-50/80 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <UserPlus className="text-gray-400" size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Yeni tələbə yoxdur</p>
                  <p className="text-xs text-gray-500 mt-1">Bu ay {selectedMonthLabel} üçün qeydiyyat tapılmadı.</p>
                </div>
              ) : (
                <div className="space-y-1 divide-y divide-gray-100/70 dark:divide-gray-800/60">
                  {joined.map((child) => (
                    <Link
                      key={child.id}
                      href={`/children/${child.id}`}
                      className="flex items-center justify-between px-2.5 py-2.5 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 rounded-xl transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#1e2130]"
                    >
                      <div className="flex items-center gap-3.5">
                        <Avatar name={`${child.firstName} ${child.lastName}`} size="sm" className="ring-2 ring-white dark:ring-gray-900 shadow-sm" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {child.firstName} {child.lastName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {child.divisionName ? `${child.divisionName} / ${child.groupName}` : child.groupName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-300">
                            {child.registrationDate ? formatDate(child.registrationDate) : '-'}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 bg-emerald-50/80 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded-md mt-1">
                            Daxil oldu
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
        </Card>

          <Card padding="lg" className="flex flex-col h-full border-t-2 border-t-rose-500">
            <CardHeader className="mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                  <ArrowUpRight className="text-rose-500" size={20} />
                </div>
                <div>
                  <CardTitle className="text-base">Ayrılanlar</CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{selectedMonthLabel}</p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-full text-rose-600 dark:text-rose-400">
                {left.length}
              </span>
            </CardHeader>

            <div className="flex-1">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                    </div>
                  ))}
                </div>
              ) : left.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 bg-gray-50/80 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <UserMinus className="text-gray-400" size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Ayrılan tələbə yoxdur</p>
                  <p className="text-xs text-gray-500 mt-1">Bu ay {selectedMonthLabel} üçün ayrılan qeydə alınmadı.</p>
                </div>
              ) : (
                <div className="space-y-1 divide-y divide-gray-100/70 dark:divide-gray-800/60">
                  {left.map((child) => (
                    <Link
                      key={child.id}
                      href={`/children/${child.id}`}
                      className="flex items-center justify-between px-2.5 py-2.5 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 rounded-xl transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#1e2130]"
                    >
                      <div className="flex items-center gap-3.5">
                        <Avatar name={`${child.firstName} ${child.lastName}`} size="sm" className="ring-2 ring-white dark:ring-gray-900 shadow-sm opacity-90 grayscale-[30%]" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-through decoration-gray-300 dark:decoration-gray-600 decoration-1">
                            {child.firstName} {child.lastName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            {child.divisionName ? `${child.divisionName} / ${child.groupName}` : child.groupName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-300">
                            {child.deactivationDate ? formatDate(child.deactivationDate) : '-'}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-600 bg-rose-50/80 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-md mt-1">
                            Ayrıldı
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
