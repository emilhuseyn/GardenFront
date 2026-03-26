'use client';
import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchBar } from '@/components/ui/SearchBar';
import { BarChart } from '@/components/charts/BarChart';
import { AttendanceHeatmapPro } from '@/components/attendance/AttendanceHeatmapPro';
import { attendanceApi } from '@/lib/api/attendance';
import { groupsApi } from '@/lib/api/groups';
import { formatMonthYear } from '@/lib/utils/format';
import { MONTHS } from '@/lib/utils/constants';
import type { MonthlyAttendance, DailyAttendance, Group } from '@/types';

const YEAR_OPTIONS = [
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
];

export default function AttendanceReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [report, setReport] = useState<MonthlyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupReports, setGroupReports] = useState<{ groupId: number; groupName: string; divisionName: string; avgPct: number }[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dailyGroupId, setDailyGroupId] = useState('');
  const [dailyReport, setDailyReport] = useState<DailyAttendance | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySearch, setDailySearch] = useState('');
  const [dailyStatusFilter, setDailyStatusFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all');
  const [dailySort, setDailySort] = useState<'name-asc' | 'name-desc' | 'arrival-asc' | 'arrival-desc'>('name-asc');
  const [monthlySearch, setMonthlySearch] = useState('');
  const [monthlyStatusFilter, setMonthlyStatusFilter] = useState<'all' | 'strong' | 'risk' | 'critical'>('all');
  const [monthlySort, setMonthlySort] = useState<'pct-desc' | 'pct-asc' | 'name-asc' | 'absent-desc' | 'late-desc'>('pct-desc');
  const [groupCompareDivision, setGroupCompareDivision] = useState('all');
  const [groupCompareSort, setGroupCompareSort] = useState<'pct-desc' | 'pct-asc' | 'name-asc' | 'division-asc'>('pct-desc');

  useEffect(() => {
    groupsApi.getAll().then(setGroups).catch(() => {});
  }, []);

  useEffect(() => {
    const loadMonthly = async () => {
      setLoading(true);
      try {
        const data = await attendanceApi.getMonthly(Number(month), Number(year), groupId ? Number(groupId) : undefined);
        setReport(data);
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    void loadMonthly();
  }, [month, year, groupId]);

  useEffect(() => {
    if (groups.length === 0) return;
    const loadGroupReports = async () => {
      setGroupLoading(true);
      const results = await Promise.all(
        groups.map((g) => attendanceApi.getMonthly(Number(month), Number(year), g.id).catch(() => null))
      );
        const rows = groups.map((g, i) => {
          const r = results[i];
          if (!r || r.children.length === 0 || !r.totalWorkDays) {
            return { groupId: g.id, groupName: g.name, divisionName: g.divisionName, avgPct: 0 };
          }
          const avgPct = Math.round(
            r.children.reduce((s, c) => s + (c.presentDays / r.totalWorkDays) * 100, 0) / r.children.length
          );
          return { groupId: g.id, groupName: g.name, divisionName: g.divisionName, avgPct };
        });
        setGroupReports(rows);
      setGroupLoading(false);
    };
    void loadGroupReports();
  }, [groups, month, year]);

  useEffect(() => {
    const loadDaily = async () => {
      setDailyLoading(true);
      try {
        const data = await attendanceApi.getDaily(dailyDate, dailyGroupId ? Number(dailyGroupId) : undefined);
        setDailyReport(data);
      } catch {
        setDailyReport(null);
      } finally {
        setDailyLoading(false);
      }
    };
    if (tab !== 'daily') return;
    void loadDaily();
  }, [tab, dailyDate, dailyGroupId]);

  const exportCSV = () => {
    if (!report) return;
    const headers = ['Ad Soyad', 'Gəldi', 'Gəlmədi', 'Gecikdi', 'Tez getdi', 'Davamiyyət (%)'];
    const rows = monthlyRows.map((c) => [
      c.childFullName,
      c.presentDays,
      c.absentDays,
      c.lateDays,
      c.earlyLeaveDays,
      c.pct,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `davamiyyat_${year}_${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDailyCSV = () => {
    if (!dailyReport) return;
    const headers = ['Ad Soyad', 'Status', 'Gəliş', 'Çıxış'];
    const rows = dailyRows.map((e) => [
      e.childFullName ?? '',
      e.status === 1 ? (e.isLate ? 'Gecikdi' : 'Gəldi') : 'Gəlmədi',
      e.arrivalTime ?? '',
      e.departureTime ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gunluk_davamiyyat_${dailyDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupOptions = [
    { value: '', label: 'Bütün qruplar' },
    ...groups.map((g) => ({ value: String(g.id), label: g.name })),
  ];
  const monthOptions = MONTHS.map((m) => ({ value: String(m.value), label: m.label }));

  const monthlyRows = (report?.children ?? [])
    .map((c) => ({
      ...c,
      pct: report?.totalWorkDays ? Math.round((c.presentDays / report.totalWorkDays) * 100) : 0,
    }))
    .filter((c) => {
      if (monthlySearch && !c.childFullName.toLowerCase().includes(monthlySearch.toLowerCase())) return false;
      if (monthlyStatusFilter === 'strong' && c.pct < 80) return false;
      if (monthlyStatusFilter === 'risk' && (c.pct < 60 || c.pct >= 80)) return false;
      if (monthlyStatusFilter === 'critical' && c.pct >= 60) return false;
      return true;
    })
    .sort((a, b) => {
      switch (monthlySort) {
        case 'pct-desc': return b.pct - a.pct;
        case 'pct-asc': return a.pct - b.pct;
        case 'name-asc': return a.childFullName.localeCompare(b.childFullName, 'az');
        case 'absent-desc': return b.absentDays - a.absentDays;
        case 'late-desc': return b.lateDays - a.lateDays;
        default: return 0;
      }
    });

  const dailyRows = [...(dailyReport?.entries ?? [])]
    .filter((e) => {
      if (dailySearch && !(e.childFullName ?? '').toLowerCase().includes(dailySearch.toLowerCase())) return false;
      if (dailyStatusFilter === 'present' && (!e.isPresent || e.isLate)) return false;
      if (dailyStatusFilter === 'late' && !(e.isPresent && e.isLate)) return false;
      if (dailyStatusFilter === 'absent' && e.isPresent) return false;
      return true;
    })
    .sort((a, b) => {
      const aName = a.childFullName ?? '';
      const bName = b.childFullName ?? '';
      const aArrival = a.arrivalTime ?? '';
      const bArrival = b.arrivalTime ?? '';
      switch (dailySort) {
        case 'name-asc': return aName.localeCompare(bName, 'az');
        case 'name-desc': return bName.localeCompare(aName, 'az');
        case 'arrival-asc': return aArrival.localeCompare(bArrival);
        case 'arrival-desc': return bArrival.localeCompare(aArrival);
        default: return 0;
      }
    });

  const filteredGroupReports = [...groupReports]
    .filter((g) => groupCompareDivision === 'all' || g.divisionName === groupCompareDivision)
    .sort((a, b) => {
      switch (groupCompareSort) {
        case 'pct-desc': return b.avgPct - a.avgPct;
        case 'pct-asc': return a.avgPct - b.avgPct;
        case 'name-asc': return a.groupName.localeCompare(b.groupName, 'az');
        case 'division-asc': return a.divisionName.localeCompare(b.divisionName, 'az');
        default: return 0;
      }
    });

  const chartData = monthlyRows.map((c) => ({
    name: c.childFullName.split(' ')[0],
    value: c.pct,
  }));

  const avgPresent =
    monthlyRows.length > 0
      ? Math.round(monthlyRows.reduce((s, c) => s + c.presentDays, 0) / monthlyRows.length)
      : 0;
  const totalLate = monthlyRows.reduce((s, c) => s + c.lateDays, 0);
  const frequentAbsent = monthlyRows.filter((c) => c.absentDays > 5).length;

  const divisionStats = Object.values(
    filteredGroupReports.reduce<Record<string, { name: string; total: number; count: number }>>((acc, g) => {
      if (!acc[g.divisionName]) acc[g.divisionName] = { name: g.divisionName, total: 0, count: 0 };
      acc[g.divisionName].total += g.avgPct;
      acc[g.divisionName].count += 1;
      return acc;
    }, {})
  )
    .map((d) => ({ name: d.name, avgPct: d.count > 0 ? Math.round(d.total / d.count) : 0 }))
    .sort((a, b) => b.avgPct - a.avgPct);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Davamiyyət Hesabatı"
        description={tab === 'daily' ? 'Günlük davamiyyət siyahısı' : 'Aylıq davamiyyət statistikası'}
        actions={
          tab === 'daily' ? (
            <Button onClick={exportDailyCSV} disabled={!dailyReport || dailyLoading}>
              <Download size={15} /> Excel yüklə
            </Button>
          ) : (
            <Button onClick={exportCSV} disabled={!report || loading}>
              <Download size={15} /> Excel yüklə
            </Button>
          )
        }
      />

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['daily', 'monthly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'daily' ? 'Günlük' : 'Aylıq'}
          </button>
        ))}
      </div>

      {/* ─── GÜNLÜK TAB ─── */}
      {tab === 'daily' && (
        <>
          <div className="bg-white border border-white-border rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="border border-white-border rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-accent-green/30"
              />
              <Select
                value={dailyGroupId}
                onChange={(e) => setDailyGroupId(e.target.value)}
                options={groupOptions}
                className="w-44"
              />
              <SearchBar
                value={dailySearch}
                onChange={setDailySearch}
                placeholder="Uşaq axtar..."
                className="sm:w-64"
              />
              <Select
                value={dailyStatusFilter}
                onChange={(e) => setDailyStatusFilter(e.target.value as typeof dailyStatusFilter)}
                options={[
                  { value: 'all', label: 'Bütün statuslar' },
                  { value: 'present', label: 'Gəldi' },
                  { value: 'late', label: 'Gecikdi' },
                  { value: 'absent', label: 'Gəlmədi' },
                ]}
                className="w-44"
              />
              <Select
                value={dailySort}
                onChange={(e) => setDailySort(e.target.value as typeof dailySort)}
                options={[
                  { value: 'name-asc', label: 'Ad A-Z' },
                  { value: 'name-desc', label: 'Ad Z-A' },
                  { value: 'arrival-asc', label: 'Gəliş vaxtı artan' },
                  { value: 'arrival-desc', label: 'Gəliş vaxtı azalan' },
                ]}
                className="w-48"
              />
            </div>

            {(dailySearch || dailyStatusFilter !== 'all') && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500 mr-1">Seçilənlər:</span>
                {dailySearch && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    Axtarış: {dailySearch}
                    <button onClick={() => setDailySearch('')} className="hover:opacity-70"><X size={10} /></button>
                  </span>
                )}
                {dailyStatusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    Status: {dailyStatusFilter === 'present' ? 'Gəldi' : dailyStatusFilter === 'late' ? 'Gecikdi' : 'Gəlmədi'}
                    <button onClick={() => setDailyStatusFilter('all')} className="hover:opacity-70"><X size={10} /></button>
                  </span>
                )}
                <button
                  onClick={() => { setDailySearch(''); setDailyStatusFilter('all'); setDailySort('name-asc'); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Hamısını sıfırla
                </button>
                <span className="ml-auto text-xs text-gray-400">{dailyRows.length} nəticə</span>
              </div>
            )}
          </div>

          {dailyLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Cəmi uşaq', value: dailyReport?.totalChildren ?? 0, color: 'text-accent-blue', bg: 'bg-blue-50' },
                { label: 'Gəldi', value: dailyReport?.presentCount ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Gəlmədi', value: dailyReport?.absentCount ?? 0, color: 'text-accent-rose', bg: 'bg-rose-50' },
                { label: 'Gecikdi', value: dailyReport?.lateCount ?? 0, color: 'text-accent-amber', bg: 'bg-amber-50' },
              ].map((s, i) => (
                <div key={i} className={`rounded-2xl p-4 border border-white-border ${s.bg}`}>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold font-display mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {!dailyLoading && dailyReport && dailyRows.length > 0 ? (
            <div className="bg-white border border-white-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white-border">
                <h3 className="text-sm font-semibold text-gray-700">Günlük Davamiyyət Siyahısı</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-white-border">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad Soyad</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Gəliş</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Çıxış</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRows.map((e, i) => (
                      <tr key={e.childId} className={`border-b border-white-border ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.childFullName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${e.isPresent ? (e.isLate ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700') : 'bg-rose-100 text-rose-700'}`}>
                            {e.isPresent ? (e.isLate ? 'Gecikdi' : 'Gəldi') : 'Gəlmədi'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500 hidden sm:table-cell">{e.arrivalTime ?? '-'}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500 hidden sm:table-cell">{e.departureTime ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !dailyLoading && dailyReport && dailyReport.entries.length > 0 ? (
            <div className="bg-white border border-white-border rounded-2xl p-12 text-center">
              <p className="text-sm text-gray-400">Filterlərə uyğun nəticə tapılmadı</p>
            </div>
          ) : !dailyLoading && (
            <div className="bg-white border border-white-border rounded-2xl p-12 text-center">
              <p className="text-sm text-gray-400">Seçilmiş tarix üçün məlumat tapılmadı</p>
            </div>
          )}
        </>
      )}

      {/* ─── AYLIK TAB ─── */}
      {tab === 'monthly' && (<>

      {/* Filters */}
      <div className="bg-white border border-white-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <Select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            options={monthOptions}
            className="w-36"
          />
          <Select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={YEAR_OPTIONS}
            className="w-28"
          />
          <Select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            options={groupOptions}
            className="w-44"
          />
          <SearchBar
            value={monthlySearch}
            onChange={setMonthlySearch}
            placeholder="Uşaq axtar..."
            className="sm:w-64"
          />
          <Select
            value={monthlyStatusFilter}
            onChange={(e) => setMonthlyStatusFilter(e.target.value as typeof monthlyStatusFilter)}
            options={[
              { value: 'all', label: 'Bütün səviyyələr' },
              { value: 'strong', label: 'Yaxşı davamiyyət 80%+' },
              { value: 'risk', label: 'Orta risk 60-79%' },
              { value: 'critical', label: 'Riskli 0-59%' },
            ]}
            className="w-52"
          />
          <Select
            value={monthlySort}
            onChange={(e) => setMonthlySort(e.target.value as typeof monthlySort)}
            options={[
              { value: 'pct-desc', label: 'Faiz yüksəkdən aşağı' },
              { value: 'pct-asc', label: 'Faiz aşağıdan yuxarı' },
              { value: 'name-asc', label: 'Ad A-Z' },
              { value: 'absent-desc', label: 'Ən çox gəlməyənlər' },
              { value: 'late-desc', label: 'Ən çox gecikənlər' },
            ]}
            className="w-56"
          />
        </div>

        {(monthlySearch || monthlyStatusFilter !== 'all' || groupId) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 mr-1">Seçilənlər:</span>
            {groupId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Qrup: {groups.find((g) => String(g.id) === groupId)?.name ?? groupId}
                <button onClick={() => setGroupId('')} className="hover:opacity-70"><X size={10} /></button>
              </span>
            )}
            {monthlySearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Axtarış: {monthlySearch}
                <button onClick={() => setMonthlySearch('')} className="hover:opacity-70"><X size={10} /></button>
              </span>
            )}
            {monthlyStatusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Səviyyə: {monthlyStatusFilter === 'strong' ? 'Yaxşı davamiyyət' : monthlyStatusFilter === 'risk' ? 'Orta risk' : 'Riskli'}
                <button onClick={() => setMonthlyStatusFilter('all')} className="hover:opacity-70"><X size={10} /></button>
              </span>
            )}
            <button
              onClick={() => { setMonthlySearch(''); setMonthlyStatusFilter('all'); setMonthlySort('pct-desc'); setGroupId(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Hamısını sıfırla
            </button>
            <span className="ml-auto text-xs text-gray-400">{monthlyRows.length} nəticə</span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'İş günləri', value: report?.totalWorkDays ?? 0, color: 'text-accent-blue', bg: 'bg-blue-50' },
            { label: 'Ort. gəliş (gün)', value: avgPresent, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Cəmi gecikmə', value: totalLate, color: 'text-accent-amber', bg: 'bg-amber-50' },
            { label: '5+ gün gəlmədi', value: frequentAbsent, color: 'text-accent-rose', bg: 'bg-rose-50' },
          ].map((s, i) => (
            <div key={i} className={`rounded-2xl p-4 border border-white-border ${s.bg}`}>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-xl font-bold font-display mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <AttendanceHeatmapPro
        groups={groups}
        month={Number(month)}
        year={Number(year)}
        selectedGroupId={groupId ? Number(groupId) : null}
      />

      {/* Attendance % chart */}
      <div className="bg-white border border-white-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">
          Uşaq üzrə Davamiyyət (%) - {formatMonthYear(Number(month), Number(year))}
        </h3>
        <p className="text-xs text-gray-400 mb-4">Hər uşağın aylıq davamiyyət faizi</p>
        {loading ? (
          <Skeleton className="h-72" />
        ) : chartData.length > 0 ? (
          <BarChart
            data={chartData}
            dataKey="value"
            xKey="name"
            color="#34C47E"
            height={300}
            label="Davamiyyət %"
            formatTooltip={(v) => `${v}%`}
          />
        ) : (
          <p className="text-sm text-gray-400 text-center py-16">Məlumat tapılmadı</p>
        )}
      </div>

      {/* Detail table */}
      {!loading && report && monthlyRows.length > 0 && (
        <div className="bg-white border border-white-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white-border">
            <h3 className="text-sm font-semibold text-gray-700">Ətraflı Cədvəl</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-white-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad Soyad</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Gəldi</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Gəlmədi</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Gecikdi</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Tez getdi</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((c, i) => {
                  const pct = c.pct;
                  return (
                    <tr
                      key={c.childId}
                      className={`border-b border-white-border ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.childFullName}</td>
                      <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">{c.presentDays}</td>
                      <td className="px-4 py-3 text-center text-sm text-rose-500">{c.absentDays}</td>
                      <td className="px-4 py-3 text-center text-sm text-amber-500 hidden sm:table-cell">{c.lateDays}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-400 hidden sm:table-cell">{c.earlyLeaveDays}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                            pct >= 80
                              ? 'bg-green-100 text-green-700'
                              : pct >= 60
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!loading && report && report.children.length > 0 && monthlyRows.length === 0 && (
        <div className="bg-white border border-white-border rounded-2xl p-12 text-center">
          <p className="text-sm text-gray-400">Filterlərə uyğun nəticə tapılmadı</p>
        </div>
      )}

      {/* Qrup üzrə Müqayisə */}
      <div className="bg-white border border-white-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Qrup üzrə Müqayisə (%)</h3>
            <p className="text-xs text-gray-400">Hər qrupun ortalama aylıq davamiyyət faizi - {formatMonthYear(Number(month), Number(year))}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={groupCompareDivision}
              onChange={(e) => setGroupCompareDivision(e.target.value)}
              options={[
                { value: 'all', label: 'Bütün bölmələr' },
                ...Array.from(new Set(groupReports.map((g) => g.divisionName))).sort().map((name) => ({ value: name, label: name })),
              ]}
              className="w-44"
            />
            <Select
              value={groupCompareSort}
              onChange={(e) => setGroupCompareSort(e.target.value as typeof groupCompareSort)}
              options={[
                { value: 'pct-desc', label: 'Faiz yüksəkdən aşağı' },
                { value: 'pct-asc', label: 'Faiz aşağıdan yuxarı' },
                { value: 'name-asc', label: 'Qrup adı A-Z' },
                { value: 'division-asc', label: 'Bölmə A-Z' },
              ]}
              className="w-48"
            />
          </div>
        </div>
        {groupLoading ? (
          <Skeleton className="h-64" />
        ) : filteredGroupReports.length > 0 ? (
          <BarChart data={filteredGroupReports} dataKey="avgPct" xKey="groupName" color="#4A90D9" height={280} label="Davamiyyət %" />
        ) : (
          <p className="text-sm text-gray-400 text-center py-14">Məlumat tapılmadı</p>
        )}
      </div>

      {/* Bölmə üzrə Davamiyyət Statistikası */}
      {divisionStats.length > 0 && (
        <div className="bg-white border border-white-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Bölmə üzrə Davamiyyət Statistikası</h3>
          <div className="space-y-5">
            {divisionStats.map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{d.name}</span>
                  <span className={`text-sm font-bold ${
                    d.avgPct >= 80 ? 'text-green-600' : d.avgPct >= 60 ? 'text-amber-600' : 'text-rose-600'
                  }`}>{d.avgPct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      d.avgPct >= 80 ? 'bg-green-500' : d.avgPct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${d.avgPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
