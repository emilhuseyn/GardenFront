'use client';
import Image from 'next/image';
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
import { childrenApi } from '@/lib/api/children';
import { paymentsApi } from '@/lib/api/payments';
import { groupsApi } from '@/lib/api/groups';
import type { DebtorInfo, MonthlyPaymentReport, DailyPaymentReport, Payment } from '@/types';

const TABS = ['Ödənişlər', 'Borclular', 'Günlük', 'Hesabat'] as const;
type Tab = typeof TABS[number];

const AZ_MONTHS = ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'];
const AZ_MONTHS_LOWER = ['yan','fev','mar','apr','may','iyn','iyl','avq','sen','okt','noy','dek'];

interface RollingMonthColumn {
  label: string;
  month: number;
  year: number;
}

function buildRollingMonthColumns(referenceDate: Date, monthCount = 12): RollingMonthColumn[] {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (monthCount - 1), 1);
  return Array.from({ length: monthCount }, (_, i) => {
    const current = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const next = new Date(start.getFullYear(), start.getMonth() + i + 1, 1);
    return {
      label: `${AZ_MONTHS_LOWER[current.getMonth()]}-${AZ_MONTHS_LOWER[next.getMonth()]}`,
      month: current.getMonth() + 1,
      year: current.getFullYear(),
    };
  });
}

type ExportMonthStatus = 'paid' | 'partial' | 'debt' | 'empty';

function getExcelColumnName(columnNumber: number): string {
  let dividend = columnNumber;
  let columnName = '';

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

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
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [paymentsTableReady, setPaymentsTableReady] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'has-debt' | 'has-partial' | 'full'>('all');
  const [paymentDiscount, setPaymentDiscount] = useState<'all' | 'has_discount' | 'no_discount'>('all');
  const [paymentSort, setPaymentSort] = useState<'name' | 'fee'>('name');
  const [debtorSearch, setDebtorSearch] = useState('');
  const [debtorSort, setDebtorSort] = useState<'debt-desc' | 'debt-asc' | 'months-desc' | 'months-asc' | 'name-asc'>('debt-desc');
  const [debtorGroupFilter, setDebtorGroupFilter] = useState('all');
  const [debtorDivisionFilter, setDebtorDivisionFilter] = useState('all');
  const [dailySort, setDailySort] = useState<'name' | 'amount-desc' | 'amount-asc'>('name');
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    groupsApi.getAll().then((gs) => {
      setGroups([{ value: '', label: 'Bütün qruplar' }, ...gs.map((g) => ({ value: String(g.id), label: g.name }))]);
    }).catch(() => {}).finally(() => setLoadingGroups(false));
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
      const rawMessage = error instanceof Error ? error.message : '';
      const normalized = rawMessage.toLowerCase();

      if (
        normalized.includes('404') ||
        normalized.includes('not found') ||
        normalized.includes('tapılmadı')
      ) {
        toast.error('Ödəniş tapılmadı');
      } else if (
        normalized.includes('401') ||
        normalized.includes('403') ||
        normalized.includes('unauthorized') ||
        normalized.includes('forbidden') ||
        normalized.includes('səlahiyyət')
      ) {
        toast.error('Səlahiyyət yoxdur');
      } else {
        toast.error(rawMessage || 'Ödəniş silinmədi');
      }
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

  const exportPaymentsExcel = async () => {
    if (exportingExcel) return;
    setExportingExcel(true);

    try {
      const ExcelJS = await import('exceljs');

      const fetchChildrenByStatus = async (status: 'Active' | 'Inactive') => {
        const allAtOnce = await childrenApi.getAll(
          {
            status,
            groupId: selectedGroupId ?? undefined,
            pageSize: 0,
          },
          { silentError: true }
        );

        const totalPages = Math.max(allAtOnce.totalPages || 1, 1);
        if (!allAtOnce.hasNextPage && totalPages <= 1) {
          return allAtOnce.items;
        }

        const firstPage = await childrenApi.getAll(
          {
            status,
            groupId: selectedGroupId ?? undefined,
            page: 1,
            pageSize: 200,
          },
          { silentError: true }
        );

        let allItems = [...firstPage.items];
        const fallbackTotalPages = Math.max(firstPage.totalPages || 1, 1);
        if (firstPage.hasNextPage || fallbackTotalPages > 1) {
          for (let page = 2; page <= fallbackTotalPages; page += 1) {
            const nextPage = await childrenApi.getAll(
              {
                status,
                groupId: selectedGroupId ?? undefined,
                page,
                pageSize: 200,
              },
              { silentError: true }
            );
            allItems = allItems.concat(nextPage.items);
          }
        }

        return allItems;
      };

      const [activeChildren, inactiveChildren] = await Promise.all([
        fetchChildrenByStatus('Active'),
        fetchChildrenByStatus('Inactive'),
      ]);

      const children = Array.from(
        new Map([...activeChildren, ...inactiveChildren].map((child) => [child.id, child])).values()
      );

      const paymentHistories = await Promise.all(
        children.map((child) => paymentsApi.getChildHistory(child.id).catch(() => [] as Payment[]))
      );

      const monthDefs = buildRollingMonthColumns(now, 12);
      const periodStart = monthDefs[0];
      const periodEnd = monthDefs[monthDefs.length - 1];

      const mappedRows = children.map((child, i) => {
        const discount = child.discountPercentage ?? 0;
        const plannedAmount = discount > 0
          ? child.monthlyFee - (child.monthlyFee * discount) / 100
          : child.monthlyFee;

        const paymentMap = new Map<string, Payment>();
        for (const payment of paymentHistories[i]) {
          const key = `${payment.year}-${payment.month}`;
          const prev = paymentMap.get(key);
          if (!prev || payment.id > prev.id) paymentMap.set(key, payment);
        }

        const monthCells = monthDefs.map((def) => {
          const payment = paymentMap.get(`${def.year}-${def.month}`);
          if (!payment) {
            return {
              amount: null as number | null,
              status: 'empty' as ExportMonthStatus,
            };
          }

          const amount = Number.isFinite(payment.paidAmount) && payment.paidAmount > 0
            ? payment.paidAmount
            : Number.isFinite(payment.finalAmount) && payment.finalAmount > 0
              ? payment.finalAmount
              : plannedAmount;

          let status: ExportMonthStatus = 'debt';
          if (payment.remainingDebt <= 0) status = 'paid';
          else if (payment.paidAmount > 0) status = 'partial';

          return { amount, status };
        });

        const fullName = `${child.firstName} ${child.lastName}`.trim();
        return {
          childId: child.id,
          childName: `${child.lastName} ${child.firstName}`.trim(),
          fullName,
          parentName: child.parentFullName?.trim() || '-',
          groupName: child.groupName,
          paymentDay: child.paymentDay,
          plannedAmount,
          discount,
          childStatus: child.status,
          monthCells,
        };
      });

      const q = paymentSearch.trim().toLowerCase();
      const searchFiltered = q
        ? mappedRows.filter((r) =>
            r.fullName.toLowerCase().includes(q) ||
            r.groupName.toLowerCase().includes(q) ||
            r.parentName.toLowerCase().includes(q)
          )
        : mappedRows;

      const discountFiltered = searchFiltered.filter((r) => {
        if (paymentDiscount === 'has_discount') return r.discount > 0;
        if (paymentDiscount === 'no_discount') return r.discount <= 0;
        return true;
      });

      const statusFiltered = discountFiltered.filter((r) => {
        if (paymentStatus === 'all') return true;
        const hasDebt = r.monthCells.some((c) => c.status === 'debt');
        const hasPartial = r.monthCells.some((c) => c.status === 'partial');
        if (paymentStatus === 'has-debt') return hasDebt;
        if (paymentStatus === 'has-partial') return hasDebt || hasPartial;
        return !hasDebt && !hasPartial;
      });

      const sortedRows = [...statusFiltered].sort((a, b) =>
        paymentSort === 'fee'
          ? b.plannedAmount - a.plannedAmount
          : a.fullName.localeCompare(b.fullName, 'az')
      );

      if (sortedRows.length === 0) {
        toast.error('Export üçün məlumat tapılmadı');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'KinderGarden';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Ödənişlər', {
        views: [{ state: 'frozen', xSplit: 4, ySplit: 5 }],
      });

      const columnHeaders = [
        'valideynlərin adı',
        'uşağın soyadı, adı',
        'ödə günü',
        'məbləğ',
        ...monthDefs.map((m) => m.label),
      ];

      const lastColumn = columnHeaders.length;
      const lastColumnName = getExcelColumnName(lastColumn);

      const groupLabel = selectedGroupId !== null
        ? groups.find((g) => g.value === String(selectedGroupId))?.label ?? String(selectedGroupId)
        : 'Bütün qruplar';
      const filterMeta = [
        `Qrup: ${groupLabel}`,
        `Status: ${paymentStatus}`,
        `Endirim: ${paymentDiscount}`,
        paymentSearch.trim() ? `Axtarış: ${paymentSearch.trim()}` : '',
      ].filter(Boolean).join(' | ');

      sheet.mergeCells(`A1:${lastColumnName}1`);
      sheet.getCell('A1').value = 'Ödəniş cədvəli | Rolling son 12 ay';
      sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      sheet.mergeCells(`A2:${lastColumnName}2`);
      sheet.getCell('A2').value = `Period: ${formatMonthYear(periodStart.month, periodStart.year)} - ${formatMonthYear(periodEnd.month, periodEnd.year)} | Qeyd sayı: ${sortedRows.length}`;
      sheet.getCell('A2').font = { size: 11, color: { argb: 'FF334155' } };
      sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FFFA' } };
      sheet.getCell('A2').alignment = { horizontal: 'left', vertical: 'middle' };

      sheet.mergeCells(`A3:${lastColumnName}3`);
      sheet.getCell('A3').value = filterMeta || 'Filtr: standart';
      sheet.getCell('A3').font = { size: 10, color: { argb: 'FF475569' }, italic: true };
      sheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      sheet.getCell('A3').alignment = { horizontal: 'left', vertical: 'middle' };

      sheet.getCell('A4').value = 'Tam ödəniş';
      sheet.getCell('B4').value = 'Qismən ödəniş';
      sheet.getCell('C4').value = 'Borclu';
      sheet.getCell('D4').value = 'Məlumat yoxdur';

      sheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
      sheet.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } };
      sheet.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8CBAD' } };
      sheet.getCell('D4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

      for (let col = 1; col <= 4; col += 1) {
        const cell = sheet.getCell(4, col);
        cell.font = { bold: true, color: { argb: 'FF1E293B' }, size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      sheet.getRow(1).height = 26;
      sheet.getRow(2).height = 20;
      sheet.getRow(3).height = 19;
      sheet.getRow(4).height = 20;

      const headerRowIndex = 5;
      const headerRow = sheet.getRow(headerRowIndex);
      headerRow.values = columnHeaders;
      headerRow.height = 24;

      const applyBorder = (cell: { border?: unknown }) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
      };

      for (let col = 1; col <= lastColumn; col += 1) {
        const cell = headerRow.getCell(col);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: col <= 4 ? 'FF475569' : 'FF2563EB' },
        };
        applyBorder(cell);
      }

      const widths = [28, 30, 10, 12, ...monthDefs.map(() => 11)];
      widths.forEach((width, i) => {
        sheet.getColumn(i + 1).width = width;
      });

      const dataStart = headerRowIndex + 1;
      sortedRows.forEach((row, idx) => {
        const rowIndex = dataStart + idx;
        const excelRow = sheet.getRow(rowIndex);

        const monthValues = row.monthCells.map((cell) => cell.amount);
        excelRow.values = [
          row.parentName,
          row.childName,
          row.paymentDay,
          row.plannedAmount,
          ...monthValues,
        ];

        excelRow.height = 21;

        for (let col = 1; col <= lastColumn; col += 1) {
          const cell = excelRow.getCell(col);
          applyBorder(cell);

          if (col === 1 || col === 2) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }

          if (col === 4 || col >= 5) {
            cell.numFmt = '#,##0" ₼"';
          }

          if (idx % 2 === 1 && col < 5) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }

          if (col === 4) {
            cell.font = { bold: true, color: { argb: 'FF1F2937' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE7F3' } };
          }

          if (col >= 5) {
            const monthCell = row.monthCells[col - 5];
            if (monthCell.status === 'paid') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
              cell.font = { color: { argb: 'FF006100' }, bold: true };
            } else if (monthCell.status === 'partial') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } };
              cell.font = { color: { argb: 'FF7C5700' }, bold: true };
            } else if (monthCell.status === 'debt') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8CBAD' } };
              cell.font = { color: { argb: 'FF9C0006' }, bold: true };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
              cell.font = { color: { argb: 'FF6B7280' } };
            }
          }
        }

        if (row.childStatus === 'Inactive') {
          excelRow.getCell(2).font = { color: { argb: 'FF6B7280' }, italic: true };
        }
      });

      const totalRowIndex = dataStart + sortedRows.length;
      const totalRow = sheet.getRow(totalRowIndex);
      totalRow.getCell(1).value = 'CƏMİ';
      totalRow.getCell(1).font = { bold: true, color: { argb: 'FF111827' } };
      totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      totalRow.height = 23;

      const amountColumn = getExcelColumnName(4);
      totalRow.getCell(4).value = { formula: `SUM(${amountColumn}${dataStart}:${amountColumn}${totalRowIndex - 1})` };
      totalRow.getCell(4).numFmt = '#,##0" ₼"';
      totalRow.getCell(4).font = { bold: true, color: { argb: 'FF111827' } };

      for (let col = 5; col <= lastColumn; col += 1) {
        const colName = getExcelColumnName(col);
        const cell = totalRow.getCell(col);
        cell.value = { formula: `SUM(${colName}${dataStart}:${colName}${totalRowIndex - 1})` };
        cell.numFmt = '#,##0" ₼"';
        cell.font = { bold: true, color: { argb: 'FF111827' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      for (let col = 1; col <= lastColumn; col += 1) {
        const cell = totalRow.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        applyBorder(cell);
      }

      sheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex, column: lastColumn },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `odenisler_son12ay_${periodStart.year}_${String(periodStart.month).padStart(2, '0')}_${periodEnd.year}_${String(periodEnd.month).padStart(2, '0')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Excel faylı hazırlandı');
    } catch {
      toast.error('Excel export alınmadı');
    } finally {
      setExportingExcel(false);
    }
  };

  const totalDebt = debtors.reduce((s, d) => s + d.totalDebt, 0);
  const showBootLoader = loadingDebtors || loadingReports || loadingGroups || !paymentsTableReady;

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
            <p className="text-sm text-gray-500 dark:text-gray-400">Ödənişlər yüklənir...</p>
          </div>
        </div>
      )}

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
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
              <SearchBar
                value={paymentSearch}
                onChange={setPaymentSearch}
                placeholder="Uşaq, qrup və ya valideyn adı axtar..."
                className="flex-1 min-w-[200px] w-full sm:w-auto"
              />
              <Select
                value={selectedGroupId ? String(selectedGroupId) : ''}
                onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
                options={groups}
                className="w-52"
              />
              <Select
                value={paymentDiscount}
                onChange={(e) => setPaymentDiscount(e.target.value as 'all' | 'has_discount' | 'no_discount')}
                options={[
                  { value: 'all', label: 'Bütün (Endirim)' },
                  { value: 'has_discount', label: 'Endirimli' },
                  { value: 'no_discount', label: 'Endirimsiz' }
                ]}
                className="w-44"
              />
              <select
                value={paymentSort}
                onChange={(e) => setPaymentSort(e.target.value as 'name' | 'fee')}
                className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="name">Ada görə A-Z</option>
                <option value="fee">Məbləğə görə ↓</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportPaymentsExcel}
                disabled={exportingExcel}
              >
                <Download size={14} /> {exportingExcel ? 'Hazırlanır...' : 'Excel export'}
              </Button>
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
            {(paymentSearch || selectedGroupId !== null || paymentStatus !== 'all' || paymentDiscount !== 'all') && (
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
                {paymentStatus !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    Status: {paymentStatus === 'has-debt' ? 'Borcu olanlar' : paymentStatus === 'has-partial' ? 'Qismən ödəniş edənlər' : 'Tam ödəniş edənlər'}
                    <button onClick={() => setPaymentStatus('all')} className="hover:opacity-70"><X size={10} /></button>
                  </span>
                )}
                {paymentDiscount !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                    Endirim: {paymentDiscount === 'has_discount' ? 'Endirimli' : 'Endirimsiz'}
                    <button onClick={() => setPaymentDiscount('all')} className="hover:opacity-70"><X size={10} /></button>
                  </span>
                )}
                <button
                  onClick={() => { setPaymentSearch(''); setSelectedGroupId(null); setPaymentStatus('all'); setPaymentDiscount('all'); }}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
                >
                  Hamısını sıfırla
                </button>
              </div>
            )}
            <PaymentTable
              onRecord={(id, month, childName) => handleRecord(Number(id), month, childName)}
              onInitialLoadDone={() => setPaymentsTableReady(true)}
              refreshKey={tableRefreshKey}
              groupId={selectedGroupId}
              search={paymentSearch}
              statusFilter={paymentStatus}
              discountFilter={paymentDiscount}
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
