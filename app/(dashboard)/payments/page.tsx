'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from '@/components/ui/Drawer';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { PaymentTable } from '@/components/payments/PaymentTable';
import { DebtorRow } from '@/components/payments/DebtorRow';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { SmartPaymentForecast } from '@/components/payments/SmartPaymentForecast';
import { BarChart } from '@/components/charts/BarChart';
import { Badge } from '@/components/ui/Badge';
import { Download, Plus, Search, Trash2, X } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { formatCurrency, formatMonthYear } from '@/lib/utils/format';
import { cn } from '@/lib/utils/constants';
import { paymentsApi } from '@/lib/api/payments';
import { groupsApi } from '@/lib/api/groups';
import type { DebtorInfo, MonthlyPaymentReport, DailyPaymentReport, Payment } from '@/types';

const TABS = ['Ödənişlər', 'Borclular', 'Günlük', 'Hesabat'] as const;
type Tab = typeof TABS[number];

const AZ_MONTHS = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];

export default function PaymentsPage() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>('Ödənişlər');
  const [drawerOpen, setOpen] = useState(false);
  const [selectedChild, setChild] = useState<{ id: number; month: number; name?: string } | null>(null);
  const [debtors, setDebtors] = useState<DebtorInfo[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<{ month: string; value: number }[]>([]);
  const [currentMonthReport, setCurrentMonthReport] = useState<MonthlyPaymentReport | null>(null);
  const [loadingDebtors, setLoadingDebtors] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);

  // Daily report
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [dailyDate, setDailyDate] = useState(todayStr);
  const [dailyReport, setDailyReport] = useState<DailyPaymentReport | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [groups, setGroups] = useState<{ value: string; label: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'has-debt' | 'has-partial' | 'full'>('all');
  const [paymentSort, setPaymentSort] = useState<'name' | 'fee'>('name');
  const [debtorSearch, setDebtorSearch] = useState('');
  const [debtorSort, setDebtorSort] = useState<'debt-desc' | 'debt-asc' | 'months-desc' | 'months-asc' | 'name-asc'>('debt-desc');
  const [debtorGroupFilter, setDebtorGroupFilter] = useState('all');
  const [debtorDivisionFilter, setDebtorDivisionFilter] = useState('all');
  const [dailySort, setDailySort] = useState<'name' | 'amount-desc' | 'amount-asc'>('name');
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    groupsApi.getAll().then((gs) => {
      setGroups([{ value: '', label: 'Bütün qruplar' }, ...gs.map((g) => ({ value: String(g.id), label: g.name }))]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    paymentsApi
      .getDebtors()
      .then(setDebtors)
      .catch(() => toast.error('Borclular yüklənmədi'))
      .finally(() => setLoadingDebtors(false));
  }, []);

  useEffect(() => {
    const currentMonth = now.getMonth() + 1;
    const year = now.getFullYear();
    const months = Array.from({ length: Math.min(currentMonth, 6) }, (_, i) => currentMonth - i).reverse();
    Promise.all(months.map((m) => paymentsApi.getMonthlyReport(m, year).catch(() => null)))
      .then((reports) => {
        const data = months.map((m, i) => ({
          month: AZ_MONTHS[m - 1],
          value: reports[i]?.totalCollected ?? 0,
        }));
        setMonthlyReports(data);
        setCurrentMonthReport(reports.at(-1) ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingReports(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== 'Günlük') return;
    setLoadingDaily(true);
    paymentsApi
      .getDailyReport(dailyDate)
      .then(setDailyReport)
      .catch(() => setDailyReport(null))
      .finally(() => setLoadingDaily(false));
  }, [tab, dailyDate]);

  const handleRecord = (id: number, month?: number, name?: string) => {
    setChild({ id, month: month ?? (now.getMonth() + 1), name });
    setOpen(true);
  };

  const refreshPaymentOverview = () => {
    paymentsApi
      .getDebtors({ silentError: true })
      .then(setDebtors)
      .catch(() => {});

    const currentMonth = now.getMonth() + 1;
    const year = now.getFullYear();
    const months = Array.from({ length: Math.min(currentMonth, 6) }, (_, i) => currentMonth - i).reverse();

    Promise.all(months.map((m) => paymentsApi.getMonthlyReport(m, year).catch(() => null)))
      .then((reports) => {
        const data = months.map((m, i) => ({
          month: AZ_MONTHS[m - 1],
          value: reports[i]?.totalCollected ?? 0,
        }));
        setMonthlyReports(data);
        setCurrentMonthReport(reports.at(-1) ?? null);
      })
      .catch(() => {});
  };

  const handleDeletePaymentConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      const target = deleteTarget;
      await paymentsApi.delete(target.id);
      toast.success('Ödəniş silindi');

      setDailyReport((prev) => {
        if (!prev) return prev;
        const nextPayments = prev.payments.filter((p) => p.id !== target.id);
        return {
          ...prev,
          payments: nextPayments,
          paymentCount: nextPayments.length,
          totalCollected: Math.max(0, prev.totalCollected - target.paidAmount),
        };
      });

      setDeleteTarget(null);
      setTableRefreshKey((k) => k + 1);
      refreshPaymentOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ödəniş silinmədi');
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportDebtorsCSV = () => {
    const headers = ['Ad Soyad', 'Qrup', 'Bölmə', 'Telefon', 'Cəmi borc (₼)', 'Ödənilməmiş ay(lar)'];
    const rows = debtors.map((d) => [
      d.childFullName,
      d.groupName,
      d.divisionName,
      d.parentPhone,
      d.totalDebt,
      d.unpaidMonths.map((m) => AZ_MONTHS[m - 1]).join('; '),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'borclular.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMonthlyCSV = () => {
    const headers = ['Ay', 'Toplanmış (₼)'];
    const rows = monthlyReports.map((r) => [r.month, r.value]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aylik_gelir.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalDebt = debtors.reduce((s, d) => s + d.totalDebt, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ödənişlər"
        description="Aylıq ödəniş idarəetməsi"
        actions={
          <div className="flex gap-2">

            <Button onClick={() => handleRecord(0, undefined)}>
              <Plus size={15} /> Ödəniş qeyd et
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Bu ay daxil oldu', value: formatCurrency(currentMonthReport?.totalCollected ?? 0), color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Cəmi borc', value: formatCurrency(totalDebt), color: 'text-accent-rose', bg: 'bg-rose-50' },
          { label: 'Borclular sayı', value: `${debtors.length} uşaq`, color: 'text-accent-amber', bg: 'bg-amber-50' },
          { label: 'Gözlənilən', value: formatCurrency(currentMonthReport?.totalExpected ?? 0), color: 'text-accent-blue', bg: 'bg-blue-50' },
        ].map((c, i) => (
          <div key={i} className={cn('rounded-xl p-4 border border-white-border dark:border-gray-700/60', c.bg)}>
            <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={cn('text-lg font-bold font-display mt-1', c.color)}>
              {loadingDebtors || loadingReports ? '...' : c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-50 dark:bg-gray-800/60 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2 text-sm font-medium rounded-lg transition-all',
              tab === t ? 'bg-white dark:bg-[#252836] shadow-sm text-green-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            {t}
            {t === 'Borclular' && debtors.length > 0 && (
              <Badge variant="rose" size="xs" className="ml-1.5">{debtors.length}</Badge>
            )}
          </button>
        ))}
      </div>

        {tab === 'Ödənişlər' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <SearchBar
                value={paymentSearch}
                onChange={setPaymentSearch}
                placeholder="Ad, soyad axtar..."
                className="sm:w-64"
              />
              <Select
                value={selectedGroupId ? String(selectedGroupId) : ''}
                onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
                options={groups}
                className="w-52"
              />
              <select
                value={paymentSort}
                onChange={(e) => setPaymentSort(e.target.value as 'name' | 'fee')}
                className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="name">Ada görə A-Z</option>
                <option value="fee">Məbləğə görə ↓</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Ödəniş vəziyyətinə görə filtrlə:</p>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { v: 'all',         label: 'Bütün uşaqlar' },
                  { v: 'has-debt',    label: 'Borcu olanlar' },
                  { v: 'has-partial', label: 'Qismən ödəniş edənlər' },
                  { v: 'full',        label: 'Tam ödəniş edənlər' },
                ] as const).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setPaymentStatus(v)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    paymentStatus === v
                      ? 'bg-primary text-white border-primary'
                      : 'border-white-border dark:border-gray-700/60 text-gray-600 dark:text-gray-300 hover:border-primary/50'
                  )}
                >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Borcu olanlar: ən azı 1 ay ödənilməyib. Qismən ödəniş edənlər: ən azı 1 ay tam bağlanmayıb. Tam ödəniş edənlər: heç bir açıq borc yoxdur.
              </p>
            </div>
            {(paymentSearch || selectedGroupId !== null || paymentStatus !== 'all' || paymentStatus === 'all') && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Seçilənlər:</span>
                {paymentSearch && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    Axtarış: {paymentSearch}
                    <button onClick={() => setPaymentSearch('')} className="hover:opacity-70"><X size={10} /></button>
                  </span>
                )}
                {selectedGroupId !== null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    Qrup: {groups.find((g) => g.value === String(selectedGroupId))?.label ?? selectedGroupId}
                    <button onClick={() => setSelectedGroupId(null)} className="hover:opacity-70"><X size={10} /></button>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  Status: {paymentStatus === 'all' ? 'Bütün uşaqlar' : paymentStatus === 'has-debt' ? 'Borcu olanlar' : paymentStatus === 'has-partial' ? 'Qismən ödəniş edənlər' : 'Tam ödəniş edənlər'}
                  <button onClick={() => setPaymentStatus('all')} className="hover:opacity-70"><X size={10} /></button>
                </span>
                <button
                  onClick={() => { setPaymentSearch(''); setSelectedGroupId(null); setPaymentStatus('all'); }}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                >
                  Hamısını sıfırla
                </button>
              </div>
            )}
            <PaymentTable
              onRecord={(id, month, childName) => handleRecord(Number(id), month, childName)}
              refreshKey={tableRefreshKey}
              groupId={selectedGroupId}
              search={paymentSearch}
              statusFilter={paymentStatus}
              sortBy={paymentSort}
            />
          </div>
        )}

        {tab === 'Borclular' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={debtorSearch}
                  onChange={(e) => setDebtorSearch(e.target.value)}
                  placeholder="Ad, qrup axtar..."
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <select
                value={debtorGroupFilter}
                onChange={(e) => setDebtorGroupFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">Bütün qruplar</option>
                {[...new Set(debtors.map((d) => d.groupName))].sort().map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select
                value={debtorDivisionFilter}
                onChange={(e) => setDebtorDivisionFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all">Bütün bölmələr</option>
                {[...new Set(debtors.map((d) => d.divisionName))].sort().map((div) => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
              <select
                value={debtorSort}
                onChange={(e) => setDebtorSort(e.target.value as typeof debtorSort)}
                className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="debt-desc">Ən çox borc</option>
                <option value="debt-asc">Ən az borc</option>
                <option value="months-desc">Ən çox aylıq borc</option>
                <option value="months-asc">Ən az aylıq borc</option>
                <option value="name-asc">Ada görə (A-Z)</option>
              </select>
              <Button variant="secondary" size="sm" onClick={exportDebtorsCSV} disabled={debtors.length === 0}>
                <Download size={14} /> Excel yüklə
              </Button>
            </div>

            {(debtorSearch || debtorGroupFilter !== 'all' || debtorDivisionFilter !== 'all') && (
              <div className="flex flex-wrap gap-1.5">
                {debtorSearch && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    &quot;{debtorSearch}&quot;
                    <button onClick={() => setDebtorSearch('')} className="hover:opacity-70"><X size={10} /></button>
                  </span>
                )}
                {debtorGroupFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {debtorGroupFilter}
                    <button onClick={() => setDebtorGroupFilter('all')} className="hover:opacity-70"><X size={10} /></button>
                  </span>
                )}
                {debtorDivisionFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {debtorDivisionFilter}
                    <button onClick={() => setDebtorDivisionFilter('all')} className="hover:opacity-70"><X size={10} /></button>
                  </span>
                )}
                <button
                  onClick={() => { setDebtorSearch(''); setDebtorGroupFilter('all'); setDebtorDivisionFilter('all'); }}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                >
                  Hamısını sıfırla
                </button>
              </div>
            )}

            {loadingDebtors ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-xl p-4">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))
            ) : debtors.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Borclu yoxdur 🎉</p>
            ) : (() => {
              const q = debtorSearch.toLowerCase();
              const filtered = debtors.filter((d) => {
                if (q && !d.childFullName.toLowerCase().includes(q) && !d.groupName.toLowerCase().includes(q)) return false;
                if (debtorGroupFilter !== 'all' && d.groupName !== debtorGroupFilter) return false;
                if (debtorDivisionFilter !== 'all' && d.divisionName !== debtorDivisionFilter) return false;
                return true;
              });
              const sorted = [...filtered].sort((a, b) => {
                switch (debtorSort) {
                  case 'debt-desc':   return b.totalDebt - a.totalDebt;
                  case 'debt-asc':    return a.totalDebt - b.totalDebt;
                  case 'months-desc': return b.unpaidMonths.length - a.unpaidMonths.length;
                  case 'months-asc':  return a.unpaidMonths.length - b.unpaidMonths.length;
                  case 'name-asc':    return a.childFullName.localeCompare(b.childFullName, 'az');
                  default:            return 0;
                }
              });
              return sorted.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">Nəticə tapılmadı</p>
                : <>
                    <p className="text-xs text-gray-400">{sorted.length} nəticə</p>
                    {sorted.map((d, i) => (
                      <DebtorRow key={d.childId} debtor={d} index={i} onRecord={(childId) => handleRecord(childId)} />
                    ))}
                  </>;
            })()}
          </div>
        )}

      {tab === 'Günlük' && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4 flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 dark:bg-[#252836] focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
              <span className="text-xs text-gray-400">Tarix seçin</span>
              {dailyReport && dailyReport.paymentCount > 0 && (
                <div className="ml-auto flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>Sıralama:</span>
                  {([
                    { v: 'name',        label: 'Ad' },
                    { v: 'amount-desc', label: 'Məbləğ ↓' },
                    { v: 'amount-asc',  label: 'Məbləğ ↑' },
                  ] as const).map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setDailySort(v)}
                      className={cn(
                        'px-2 py-1 rounded-md border text-xs transition-colors',
                        dailySort === v
                          ? 'border-primary/60 bg-primary/10 text-primary font-medium'
                          : 'border-white-border dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700/40'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          {loadingDaily ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : !dailyReport || dailyReport.paymentCount === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Bu tarix üçün məlumat yoxdur</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Toplanmış', value: formatCurrency(dailyReport.totalCollected), color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Ödəniş sayı', value: `${dailyReport.paymentCount} əməliyyat`, color: 'text-accent-blue', bg: 'bg-blue-50' },
                  { label: 'Ort. məbləğ', value: formatCurrency(dailyReport.paymentCount > 0 ? dailyReport.totalCollected / dailyReport.paymentCount : 0), color: 'text-accent-violet', bg: 'bg-violet-50' },
                ].map((c, i) => (
                  <div key={i} className={cn('rounded-xl p-4 border border-white-border', c.bg)}>
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className={cn('text-lg font-bold font-display mt-1', c.color)}>{c.value}</p>
                  </div>
                ))}
              </div>
              {dailyReport.payments.length > 0 && (
                <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white-border dark:border-gray-700/60">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Günlük Əməliyyatlar</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                          <tr className="bg-gray-50/50 dark:bg-gray-800/40 border-b border-white-border dark:border-gray-700/40">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad Soyad</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Ay</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Məbləğ</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Qalıq borc</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...dailyReport.payments].sort((a, b) =>
                          dailySort === 'name'        ? a.childFullName.localeCompare(b.childFullName, 'az') :
                          dailySort === 'amount-desc' ? b.paidAmount - a.paidAmount :
                                                        a.paidAmount - b.paidAmount
                        ).map((p, i) => (
                          <tr key={p.id} className={`border-b border-white-border dark:border-gray-700/40 ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-800/30'}`}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{p.childFullName}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">{AZ_MONTHS[p.month - 1]} {p.year}</td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-green-600">{formatCurrency(p.paidAmount)}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-400 dark:text-gray-500 hidden sm:table-cell">{formatCurrency(p.remainingDebt)}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setDeleteTarget(p)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Ödənişi sil"
                              >
                                <Trash2 size={12} /> Sil
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'Hesabat' && (
        <div className="space-y-5">
          <SmartPaymentForecast debtors={debtors} currentMonthReport={currentMonthReport} />
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={exportMonthlyCSV}>
              <Download size={14} /> Excel yüklə
            </Button>
          </div>
          <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Aylıq Gəlir (₼)</h3>
            {loadingReports ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <BarChart
                  data={monthlyReports}
                  dataKey="value"
                  xKey="month"
                  color="#34C47E"
                  height={300}
                />
                <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white-border">
                  {[
                    { label: 'Bu ay toplanıb', value: formatCurrency(currentMonthReport?.totalCollected ?? 0), sub: 'cari ay' },
                    { label: 'Bu ay gözlənilir', value: formatCurrency(currentMonthReport?.totalExpected ?? 0), sub: 'gözlənilir' },
                    { label: 'Cari ay borcu', value: formatCurrency(currentMonthReport?.totalDebt ?? 0), sub: 'qalıq' },
                  ].map((c, i) => (
                    <div key={i} className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400">{c.label}</p>
                      <p className="text-base font-bold text-gray-800 mt-1">{c.value}</p>
                      <p className="text-xs text-gray-400">{c.sub}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleteTarget(null);
        }}
      >
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>Ödənişi sil</ModalTitle>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Bu əməliyyat geri alına bilməz. Seçilmiş ödəniş silinəcək və hesabat göstəriciləri yenilənəcək.
            </p>
          </ModalHeader>

          {deleteTarget && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-sm text-gray-700 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-gray-200">
              <p><span className="font-medium">Uşaq:</span> {deleteTarget.childFullName}</p>
              <p><span className="font-medium">Dövr:</span> {formatMonthYear(deleteTarget.month, deleteTarget.year)}</p>
              <p><span className="font-medium">Məbləğ:</span> {formatCurrency(deleteTarget.paidAmount)}</p>
            </div>
          )}

          <ModalFooter>
            <Button variant="secondary" size="sm" disabled={deleteLoading} onClick={() => setDeleteTarget(null)}>
              Ləğv et
            </Button>
            <Button variant="danger" size="sm" loading={deleteLoading} onClick={handleDeletePaymentConfirm}>
              <Trash2 size={14} /> Sil
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Payment drawer */}
      <Drawer open={drawerOpen} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ödəniş qeyd et</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            <PaymentForm
              key={`${selectedChild?.id ?? 0}-${selectedChild?.month ?? 0}-${selectedChild?.name ?? ''}`}
              childId={selectedChild?.id}
              childName={selectedChild?.name}
              defaultMonth={selectedChild?.month}
              defaultAmount={300}
              onSuccess={() => { setOpen(false); setTableRefreshKey((k) => k + 1); }}
              onCancel={() => setOpen(false)}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
