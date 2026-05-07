'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { InsightCards } from '@/components/reports/InsightCards';
import { ScenarioSimulator } from '@/components/reports/ScenarioSimulator';
import { formatCurrency, formatMonthYear } from '@/lib/utils/format';
import { cn, MONTHS } from '@/lib/utils/constants';
import { reportsApi } from '@/lib/api/reports';
import { paymentsApi } from '@/lib/api/payments';
import { groupsApi, divisionsApi } from '@/lib/api/groups';
import { useAuthStore } from '@/lib/stores/authStore';
import type { Statistics, MonthlyPaymentReport, ActiveInactive, DivisionStats, Group, Division } from '@/types';

const YEAR_OPTIONS = [
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
];

const AZ_MONTHS = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Teacher rolü görə rəvani yönləndər
  useEffect(() => {
    if (user?.role === 'Teacher') {
      router.push('/');
    }
  }, [user, router]);

  // Ləğv et əgər Teacher olarsa
  if (user?.role === 'Teacher') {
    return null;
  }

  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [stats, setStats] = useState<Statistics | null>(null);
  const [monthlyReports, setMonthlyReports] = useState<{ month: string; value: number }[]>([]);
  const [activeInactive, setActiveInactive] = useState<ActiveInactive | null>(null);
  const [divisionStats, setDivisionStats] = useState<DivisionStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Group revenue
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupRevMonth, setGroupRevMonth] = useState(String(now.getMonth() + 1));
  const [groupRevReport, setGroupRevReport] = useState<{ group: string; value: number }[]>([]);
  const [loadingGroupRev, setLoadingGroupRev] = useState(false);

  // Division revenue
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divRevMonth, setDivRevMonth] = useState(String(now.getMonth() + 1));
  const [divRevReport, setDivRevReport] = useState<{ name: string; value: number }[]>([]);
  const [loadingDivRev, setLoadingDivRev] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [bootDone, setBootDone] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    const yr = Number(year);
    const currentMonth = now.getMonth() + 1;
    const months = Array.from({ length: Math.min(currentMonth, 6) }, (_, i) => currentMonth - i).reverse();
    setLoading(true);
    Promise.all([
      reportsApi.getStatistics(),
      reportsApi.getActiveInactive(),
      reportsApi.getDivisionStats(),
      ...months.map((m) => paymentsApi.getMonthlyReport(m, yr).catch(() => null)),
    ]).then(([statistics, ai, divStats, ...reports]) => {
      setStats(statistics as Statistics);
      setActiveInactive(ai as ActiveInactive);
      setDivisionStats(divStats as DivisionStats[]);
      const revData = months.map((m, i) => ({
        month: AZ_MONTHS[m - 1],
        value: (reports[i] as MonthlyPaymentReport | null)?.totalCollected ?? 0,
      }));
      setMonthlyReports(revData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoadingLookups(true);
    Promise.all([groupsApi.getAll(), divisionsApi.getAll()])
      .then(([g, d]) => { setGroups(g); setDivisions(d); })
      .catch(() => {})
      .finally(() => setLoadingLookups(false));
  }, []);

  useEffect(() => {
    if (groups.length === 0) return;
    setLoadingGroupRev(true);
    Promise.all(
      groups.map((g) =>
        paymentsApi.getGroupReport(g.id, Number(groupRevMonth), Number(year)).catch(() => null)
      )
    ).then((reports) => {
      setGroupRevReport(
        groups.map((g, i) => ({
          group: g.name,
          value: (reports[i] as MonthlyPaymentReport | null)?.totalCollected ?? 0,
        }))
      );
    }).catch(() => {}).finally(() => setLoadingGroupRev(false));
  }, [groups, groupRevMonth, year]);

  useEffect(() => {
    if (divisions.length === 0) return;
    setLoadingDivRev(true);
    Promise.all(
      divisions.map((d) =>
        paymentsApi.getDivisionReport(d.id, Number(divRevMonth), Number(year)).catch(() => null)
      )
    ).then((reports) => {
      setDivRevReport(
        divisions.map((d, i) => ({
          name: d.name,
          value: (reports[i] as MonthlyPaymentReport | null)?.totalCollected ?? 0,
        }))
      );
    }).catch(() => {}).finally(() => setLoadingDivRev(false));
  }, [divisions, divRevMonth, year]);

  const exportExcel = async () => {
    if (exportingExcel) return;
    setExportingExcel(true);

    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'KinderGarden';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Hesabat');
      sheet.columns = [
        { key: 'col1', width: 32 },
        { key: 'col2', width: 18 },
        { key: 'col3', width: 16 },
        { key: 'col4', width: 18 },
      ];

      const titleRow = sheet.addRow([`Hesabat ${year}`]);
      sheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`);
      titleRow.height = 24;
      titleRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };
      titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

      const dateRow = sheet.addRow(['Tarix', new Date().toISOString().slice(0, 10)]);
      dateRow.font = { size: 10, color: { argb: 'FF475569' } };
      sheet.addRow([]);

      const addSectionTitle = (title: string) => {
        const row = sheet.addRow([title]);
        sheet.mergeCells(`A${row.number}:D${row.number}`);
        row.height = 20;
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6F5B' } };
        row.alignment = { vertical: 'middle' };
      };

      const styleHeaderRow = (row: import('exceljs').Row) => {
        row.font = { bold: true, color: { argb: 'FF1F2937' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        row.alignment = { vertical: 'middle' };
      };

      const addTable = (
        title: string,
        headers: string[],
        rows: (string | number)[][],
        currencyCols: number[] = []
      ) => {
        addSectionTitle(title);
        const headerRow = sheet.addRow(headers);
        styleHeaderRow(headerRow);
        rows.forEach((r) => {
          const row = sheet.addRow(r);
          currencyCols.forEach((col) => {
            const cell = row.getCell(col);
            if (typeof cell.value === 'number') {
              cell.numFmt = '#,##0" ₼"';
            }
          });
        });
        sheet.addRow([]);
      };

      const activeCount = activeInactive?.activeCount ?? stats?.totalActiveChildren ?? 0;
      const inactiveCount = activeInactive?.inactiveCount ?? 0;
      const totalCount = activeCount + inactiveCount;

      addTable(
        'Yekun göstəricilər',
        ['Göstərici', 'Dəyər'],
        [
          ['Aktiv uşaq', String(activeCount)],
          ['Passiv uşaq', String(inactiveCount)],
          ['Ümumi uşaq', String(totalCount)],
          ['Tam günlük', String(stats?.fullDayCount ?? 0)],
          ['Yarım günlük', String(stats?.halfDayCount ?? 0)],
          ['Bu ay gəlir', formatCurrency(monthlyReports.at(-1)?.value ?? 0)],
          ['Qruplar', String(stats?.totalGroups ?? groups.length)],
          ['Bölmələr', String(stats?.totalDivisions ?? divisions.length)],
        ]
      );

      addTable(
        'Aylıq Gəlir (₼)',
        ['Ay', 'Toplanmış (₼)'],
        monthlyReports.map((r) => [r.month, r.value]),
        [2]
      );

      addTable(
        'Qrafik üzrə Paylanma',
        ['Qrafik', 'Uşaq sayı'],
        scheduleData.map((d) => [d.name, d.value])
      );

      addTable(
        'Bölmə üzrə Paylanma',
        ['Bölmə', 'Uşaq sayı'],
        divisionData.map((d) => [d.name, d.value])
      );

      addTable(
        'Aktiv / Passiv Uşaqlar',
        ['Status', 'Uşaq sayı'],
        activeData.map((d) => [d.name, d.value])
      );

      if (divisionStats.length > 0) {
        addTable(
          'Bölmə Statistikası',
          ['Bölmə', 'Qrup sayı', 'Uşaq sayı', 'Aylıq gəlir (₼)'],
          divisionStats.map((d) => [d.divisionName, d.groupCount, d.childCount, d.monthlyRevenue]),
          [4]
        );
      } else if (stats?.byDivision?.length) {
        addTable(
          'Bölmə Statistikası',
          ['Bölmə', 'Qrup sayı', 'Uşaq sayı', 'Aylıq gəlir (₼)'],
          stats.byDivision.map((d) => [d.divisionName, '-', d.childCount, '-'])
        );
      }

      const groupCountMap = new Map(groups.map((g) => [g.name, g.currentChildCount]));
      const groupLabel = formatMonthYear(Number(groupRevMonth), Number(year));
      addTable(
        `Qrup üzrə Gəlir (${groupLabel})`,
        ['Qrup', 'Uşaq sayı', 'Toplanmış (₼)'],
        groupRevReport.map((r) => [r.group, groupCountMap.get(r.group) ?? 0, r.value]),
        [3]
      );

      const divLabel = formatMonthYear(Number(divRevMonth), Number(year));
      addTable(
        `Bölmə üzrə Gəlir (${divLabel})`,
        ['Bölmə', 'Toplanmış (₼)'],
        divRevReport.map((r) => [r.name, r.value]),
        [2]
      );

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hesabat_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingExcel(false);
    }
  };

  const divisionData = (stats?.byDivision ?? []).map((d) => ({ name: d.divisionName, value: d.childCount }));
  const scheduleData = stats
    ? [
        { name: 'Tam günlük', value: stats.fullDayCount },
        { name: 'Yarım günlük', value: stats.halfDayCount },
      ]
    : [];
  const activeData = activeInactive
    ? [
        { name: 'Aktiv', value: activeInactive.activeCount },
        { name: 'Passiv', value: activeInactive.inactiveCount },
      ]
    : [];
  const totalChildren = stats?.totalActiveChildren ?? 0;
  const monthOptions = MONTHS.map((m) => ({ value: String(m.value), label: m.label }));
  const initialLoading = loading
    || loadingLookups
    || (groups.length > 0 && loadingGroupRev)
    || (divisions.length > 0 && loadingDivRev);

  useEffect(() => {
    if (!bootDone && !initialLoading) {
      setBootDone(true);
    }
  }, [bootDone, initialLoading]);

  const showBootLoader = !bootDone;

  return (
    <div className="space-y-6">
      {showBootLoader && (
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Hesabatlar yüklənir...</p>
          </div>
        </div>
      )}

      <PageHeader
        title="Hesabatlar"
        description="Ətraflı statistika və analitika"
        actions={
          <div className="flex gap-2">
            <Select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              options={YEAR_OPTIONS}
              className="w-28"
            />
            <Button onClick={exportExcel} disabled={exportingExcel || initialLoading}>
              <Download size={14} /> {exportingExcel ? 'Hazırlanır...' : 'Excel'}
            </Button>
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4">
              <Skeleton className="w-9 h-9 rounded-xl mb-3" />
              <Skeleton className="h-6 w-20 mb-1" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))
        ) : (
          [
            { label: 'Aktiv uşaq', value: String(totalChildren), icon: Users, color: 'text-accent-blue', bg: 'bg-blue-50' },
            { label: 'Bu ay gəlir', value: formatCurrency(monthlyReports.at(-1)?.value ?? 0), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Tam günlük', value: String(stats?.fullDayCount ?? 0), icon: TrendingUp, color: 'text-accent-violet', bg: 'bg-violet-50' },
            { label: 'Yarım günlük', value: String(stats?.halfDayCount ?? 0), icon: Calendar, color: 'text-accent-amber', bg: 'bg-amber-50' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                  <Icon size={16} className={s.color} />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-50 font-display">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            );
          })
        )}
      </div>

      <InsightCards />

      <ScenarioSimulator groups={groups} />

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Aylıq Gəlir (₼)</h3>
          {loading ? <Skeleton className="h-52" /> : (
            <BarChart data={monthlyReports} dataKey="value" xKey="month" color="#4A90D9" height={220} label="Məbləğ" />
          )}
        </div>
        <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Qrafik üzrə Paylanma</h3>
          {loading ? <Skeleton className="h-52" /> : (
            <DonutChart
              data={scheduleData}
              colors={['#F5A623', '#A855F7']}
              height={220}
              centerLabel={`${totalChildren} uşaq`}
            />
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Bölmə üzrə Paylanma</h3>
          {loading ? <Skeleton className="h-52" /> : (
            <DonutChart
              data={divisionData}
              colors={['#34C47E', '#4A90D9', '#F5A623', '#A855F7']}
              height={220}
              centerLabel={`${totalChildren} uşaq`}
            />
          )}
        </div>
        <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Aktiv / Passiv Uşaqlar</h3>
          {loading ? <Skeleton className="h-52" /> : (
            activeData.length > 0 ? (
              <DonutChart
                data={activeData}
                colors={['#34C47E', '#F87171']}
                height={220}
                centerLabel={
                  activeInactive
                    ? `${activeInactive.activePercentage.toFixed(0)}% aktiv`
                    : ''
                }
              />
            ) : <p className="text-sm text-gray-400 text-center py-16">Məlumat yoxdur</p>
          )}
        </div>
        <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Bölmə statistikası</h3>
          {loading ? <Skeleton className="h-52" /> : (
            <div className="space-y-3 pt-2">
              {divisionStats.length > 0
                ? divisionStats.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{d.divisionName}</p>
                        <p className="text-xs text-gray-400">{d.groupCount} qrup</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{d.childCount} uşaq</p>
                        <p className="text-xs text-green-600">{formatCurrency(d.monthlyRevenue)}</p>
                      </div>
                    </div>
                  ))
                : (stats?.byDivision ?? []).map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{d.divisionName}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{d.childCount} uşaq</span>
                    </div>
                  ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Group Revenue */}
      <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Qrup üzrə Gəlir</h3>
            <p className="text-xs text-gray-400 mt-0.5">{formatMonthYear(Number(groupRevMonth), Number(year))}</p>
          </div>
          <Select
            value={groupRevMonth}
            onChange={(e) => setGroupRevMonth(e.target.value)}
            options={monthOptions}
            className="w-36"
          />
        </div>
        {loadingGroupRev ? (
          <Skeleton className="h-52" />
        ) : groupRevReport.length > 0 ? (
          <BarChart data={groupRevReport} dataKey="value" xKey="group" color="#2EC4B6" height={220} label="Məbləğ" />
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">Məlumat tapılmadı</p>
        )}
      </div>

      {/* Division Revenue */}
      <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bölmə üzrə Gəlir</h3>
            <p className="text-xs text-gray-400 mt-0.5">{formatMonthYear(Number(divRevMonth), Number(year))}</p>
          </div>
          <Select
            value={divRevMonth}
            onChange={(e) => setDivRevMonth(e.target.value)}
            options={monthOptions}
            className="w-36"
          />
        </div>
        {loadingDivRev ? (
          <Skeleton className="h-40" />
        ) : divRevReport.length > 0 ? (
          <div className="space-y-3">
            {divRevReport.map((d, i) => {
              const total = divRevReport.reduce((s, r) => s + r.value, 0);
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{d.name}</p>
                    <div className="mt-1.5 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-green-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(d.value)}</p>
                    <p className="text-xs text-gray-400">{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">Məlumat tapılmadı</p>
        )}
      </div>
    </div>
  );
}
