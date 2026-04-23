'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Calendar, DollarSign, FileText,
  Phone, Mail, Clock, BookOpen, Edit, Sparkles,
  ArrowRightLeft, CheckCircle2, NotebookPen,
  UserCheck, UserX, Trash2, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isToday as isTodayDate, subDays, addMonths, subMonths, isSameMonth } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChildStatusBadge } from '@/components/children/ChildStatusBadge';
import { formatDate, formatCurrency, formatPhone, AZ_MONTHS } from '@/lib/utils/format';
import { cn } from '@/lib/utils/constants';
import { childrenApi } from '@/lib/api/children';
import { paymentsApi } from '@/lib/api/payments';
import { attendanceApi } from '@/lib/api/attendance';
import { groupsApi } from '@/lib/api/groups';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Child, Group, Payment, AttendanceEntry } from '@/types';

const TABS = [
  { id: 'timeline',   label: 'Zaman Xətti 360', icon: Sparkles },
  { id: 'info',       label: 'Ümumi Məlumat', icon: User },
  { id: 'attendance', label: 'Davamiyyət',     icon: Calendar },
  { id: 'payments',   label: 'Ödənişlər',      icon: DollarSign },
  { id: 'notes',      label: 'Qeydlər',        icon: FileText },
];

const statusColor: Record<string, string> = {
  present:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-900/50',
  absent:      'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-900/50',
  inactive:    'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 ring-1 ring-gray-200 dark:ring-gray-700',
  not_counted: 'bg-violet-100 dark:bg-violet-900/30 text-violet-500 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-900/50',
};

type TimelineEventType = 'registration' | 'group' | 'payment' | 'attendance' | 'note';

type TimelineEvent = {
  id: string;
  date: string;
  type: TimelineEventType;
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'neutral';
};

const EVENT_STYLE: Record<TimelineEvent['tone'], { dot: string; icon: string; card: string }> = {
  success: {
    dot: 'bg-green-500',
    icon: 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/40',
    card: 'border-green-100 dark:border-green-900/30 bg-gradient-to-r from-white dark:from-[#1e2130] to-green-50/40 dark:to-green-900/20',
  },
  warning: {
    dot: 'bg-accent-rose',
    icon: 'text-accent-rose bg-rose-50 dark:text-rose-400 dark:bg-rose-900/40',
    card: 'border-rose-100 dark:border-rose-900/30 bg-gradient-to-r from-white dark:from-[#1e2130] to-rose-50/40 dark:to-rose-900/20',
  },
  neutral: {
    dot: 'bg-accent-blue',
    icon: 'text-accent-blue bg-blue-50 dark:text-blue-400 dark:bg-blue-900/40',
    card: 'border-blue-100 dark:border-blue-900/30 bg-gradient-to-r from-white dark:from-[#1e2130] to-blue-50/40 dark:to-blue-900/20',
  },
};

function getPaymentMeta(status: Payment['status']) {
  const isPaid = status === 0 || status === 'Paid';
  const isPartial = status === 1 || status === 'PartiallyPaid';
  const statusLabel = isPaid ? 'Ödənilib' : isPartial ? 'Qismən' : 'Ödənilməyib';
  const statusVariant = isPaid ? 'paid' : isPartial ? 'partial' : 'unpaid';
  return { isPaid, isPartial, statusLabel, statusVariant };
}

function getTimelineIcon(type: TimelineEventType) {
  if (type === 'registration') return Sparkles;
  if (type === 'group') return ArrowRightLeft;
  if (type === 'payment') return DollarSign;
  if (type === 'attendance') return CheckCircle2;
  return NotebookPen;
}

interface ChildDetailProps {
  childId?: string;
  onEdit?: () => void;
}

export function ChildDetail({ childId, onEdit }: ChildDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab]       = useState('timeline');
  const [child, setChild]               = useState<Child | null>(null);
  const [payments, setPayments]         = useState<Payment[]>([]);
  const [attendance, setAttendance]     = useState<AttendanceEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [monthAttendance, setMonthAttendance] = useState<AttendanceEntry[]>([]);
  const [monthAttLoading, setMonthAttLoading] = useState(false);
  const [downloadingAgreement, setDownloadingAgreement] = useState(false);
  const [downloadingContract, setDownloadingContract] = useState(false);
  const [matchedGroupId, setMatchedGroupId] = useState<number | null>(null);

  const numId = Number(childId);

  const handleToggleStatus = async () => {
    if (!child) return;
    setActionLoading(true);
    try {
      if (child.status === 'Active') {
        await childrenApi.deactivate(numId);
        setChild((c) => c ? { ...c, status: 'Inactive' } : c);
        toast.success('Uşaq deaktiv edildi');
      } else {
        await childrenApi.activate(numId);
        setChild((c) => c ? { ...c, status: 'Active' } : c);
        toast.success('Uşaq aktiv edildi');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!child) return;
    setActionLoading(true);
    try {
      await childrenApi.delete(numId);
      toast.success('Uşaq silindi');
      router.push('/children');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Silinmə xətası');
    } finally {
      setActionLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const handleDownloadAgreement = async () => {
    if (!child) return;
    setDownloadingAgreement(true);
    try {
      const { blob, fileName } = await childrenApi.downloadAgreement(numId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Razılaşmanı yükləmək mümkün olmadı');
    } finally {
      setDownloadingAgreement(false);
    }
  };

  const handleDownloadContract = async () => {
    if (!child) return;
    setDownloadingContract(true);
    try {
      const { blob, fileName } = await childrenApi.downloadContract(numId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Kontraktı yükləmək mümkün olmadı');
    } finally {
      setDownloadingContract(false);
    }
  };

  useEffect(() => {
    if (!numId) return;
    setLoading(true);
    const today = new Date();
    const from  = format(subDays(today, 120), 'yyyy-MM-dd');
    const to    = format(today, 'yyyy-MM-dd');

    Promise.allSettled([
      childrenApi.getById(numId),
      paymentsApi.getChildHistory(numId),
      attendanceApi.getChildHistory(numId, from, to),
    ]).then(([childRes, paymentsRes, attendanceRes]) => {
      if (childRes.status === 'fulfilled')      setChild(childRes.value);
      if (paymentsRes.status === 'fulfilled')   setPayments(paymentsRes.value);
      if (attendanceRes.status === 'fulfilled') setAttendance(attendanceRes.value);
    }).finally(() => setLoading(false));
  }, [numId]);

  useEffect(() => {
    if (!child?.groupName) {
      setMatchedGroupId(null);
      return;
    }

    let active = true;

    groupsApi.getAll()
      .then((groups) => {
        if (!active) return;
        const byDivisionAndName = groups.find(
          (g: Group) => g.name === child.groupName && g.divisionName === child.divisionName
        );
        const byName = groups.find((g: Group) => g.name === child.groupName);
        setMatchedGroupId((byDivisionAndName ?? byName)?.id ?? null);
      })
      .catch(() => {
        if (active) setMatchedGroupId(null);
      });

    return () => {
      active = false;
    };
  }, [child?.groupName, child?.divisionName]);

  // Load attendance for the selected calendar month
  useEffect(() => {
    if (!numId) return;
    // If current month, reuse already-loaded attendance data
    if (isSameMonth(calendarMonth, new Date())) {
      const monthStr = format(calendarMonth, 'yyyy-MM');
      setMonthAttendance(attendance.filter((e) => e.date.startsWith(monthStr)));
      return;
    }
    setMonthAttLoading(true);
    const from = format(startOfMonth(calendarMonth), 'yyyy-MM-dd');
    const to   = format(endOfMonth(calendarMonth), 'yyyy-MM-dd');
    attendanceApi.getChildHistory(numId, from, to)
      .then(setMonthAttendance)
      .catch(() => setMonthAttendance([]))
      .finally(() => setMonthAttLoading(false));
  }, [numId, calendarMonth, attendance]);

  // Build heatmap for selected calendar month
  const heatmap = (() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const start = startOfMonth(calendarMonth);
    const end   = endOfMonth(calendarMonth);
    const registrationDate = child?.registrationDate?.slice(0, 10);
    const entryMap = new Map(monthAttendance.map((e) => [e.date, e]));
    const days: { date: string; dayNumber: number; status: 'present' | 'absent' | 'inactive' | 'not_counted'; isToday: boolean }[] = [];
    let d = new Date(start);
    while (d <= end) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const wd = d.getDay();
      if (dateStr > todayStr || (registrationDate && dateStr < registrationDate)) {
        days.push({ date: dateStr, dayNumber: d.getDate(), status: 'inactive', isToday: isTodayDate(d) });
      } else if (wd === 0 || wd === 6) {
        days.push({ date: dateStr, dayNumber: d.getDate(), status: 'not_counted', isToday: isTodayDate(d) });
      } else {
        const entry = entryMap.get(dateStr);
        const status = entry
          ? (entry.status === 4 ? 'not_counted' : entry.status === 1 ? 'present' : 'absent')
          : 'absent';
        days.push({ date: dateStr, dayNumber: d.getDate(), status, isToday: isTodayDate(d) });
      }
      d = new Date(d.getTime() + 86400000);
    }
    return days;
  })();

  const presentDays    = heatmap.filter((d) => d.status === 'present').length;
  const absentDays     = heatmap.filter((d) => d.status === 'absent').length;
  // Only weekday not_counted (bayram/xüsusi gün) — exclude weekends already in not_counted
  const notCountedDays = monthAttendance.filter((e) => {
    if (e.status !== 4) return false;
    const wd = new Date(e.date).getDay();
    return wd !== 0 && wd !== 6;
  }).length;
  const workDays       = heatmap.filter((d) => d.status !== 'inactive' && d.status !== 'not_counted').length;

  const recent30Start = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const recent30Attendance = attendance.filter((entry) => entry.date >= recent30Start && entry.status !== 4);
  const recent30Present = recent30Attendance.filter((entry) => entry.status === 1).length;
  const recent30Rate = recent30Attendance.length > 0
    ? Math.round((recent30Present / recent30Attendance.length) * 100)
    : 0;

  const timelineEvents: TimelineEvent[] = [];

  if (child?.registrationDate) {
    const regDate = child.registrationDate.slice(0, 10);
    timelineEvents.push({
      id: `reg-${child.id}`,
      date: regDate,
      type: 'registration',
      title: 'Qeydiyyat tamamlandı',
      description: `${child.firstName} ${child.lastName} sistemə əlavə edildi.`,
      tone: 'success',
    });

    const isInactiveChild = child.status === 'Inactive';
    timelineEvents.push({
      id: `grp-${child.id}`,
      date: regDate,
      type: 'group',
      title: isInactiveChild ? 'Qrupdan ayrıldı' : 'Qrupa yerləşdirildi',
      description: isInactiveChild
        ? `${child.firstName} ${child.lastName} deaktiv edildi və ${child.divisionName} / ${child.groupName} qrupundan ayrıldı.`
        : `${child.divisionName} / ${child.groupName} qrupunda aktiv edildi.`,
      tone: isInactiveChild ? 'warning' : 'neutral',
    });
  }

  for (const p of payments) {
    const paymentDate = format(new Date(p.year, Math.max(0, p.month - 1), 1), 'yyyy-MM-dd');
    const { statusLabel, isPaid, isPartial } = getPaymentMeta(p.status);
    const cbInfo = p.cashboxName ? ` • Kassa: ${p.cashboxName}` : '';
    timelineEvents.push({
      id: `pay-${p.id}`,
      date: paymentDate,
      type: 'payment',
      title: `Ödəniş: ${AZ_MONTHS[p.month - 1]} ${p.year}`,
      description: `${statusLabel} • Məbləğ: ${formatCurrency(p.finalAmount)}${isPartial ? ` • Qalıq: ${formatCurrency(p.remainingDebt)}` : ''}${cbInfo}`,
      tone: isPaid ? 'success' : isPartial ? 'neutral' : 'warning',
    });
    if (p.notes?.trim()) {
      timelineEvents.push({
        id: `pnote-${p.id}`,
        date: paymentDate,
        type: 'note',
        title: 'Ödəniş qeydi əlavə olundu',
        description: p.notes.trim(),
        tone: 'neutral',
      });
    }
  }

  for (const a of attendance) {
    const hasNote = Boolean(a.notes?.trim());
    const isPresent    = a.status === 1;
    const isNotCounted = a.status === 4;
    const hasEarlyLeave = Boolean(a.isEarlyLeave);
    if (!isPresent || hasEarlyLeave || hasNote) {
      const attendanceTitle = isNotCounted
        ? 'Davamiyyət: Sayılmır'
        : !isPresent
        ? 'Davamiyyət: Gəlmədi'
        : hasEarlyLeave
          ? 'Davamiyyət: Tez çıxıb'
          : 'Davamiyyət qeyd edildi';

      const attendanceDescription = isNotCounted
        ? 'Bu gün statistikaya daxil edilmir (bayram və ya xüsusi gün).'
        : !isPresent
        ? 'Uşaq həmin gün dərsə gəlməyib.'
        : hasEarlyLeave
          ? `Gəliş: ${a.arrivalTime || '-'}${a.departureTime ? ` • Çıxış: ${a.departureTime} (tez çıxış)` : ''}`
          : `Gəliş: ${a.arrivalTime || '-'}${a.departureTime ? ` • Çıxış: ${a.departureTime}` : ''}`;

      timelineEvents.push({
        id: `att-${a.date}-${a.childId}-${a.arrivalTime || ''}-${a.departureTime || ''}`,
        date: a.date,
        type: 'attendance',
        title: attendanceTitle,
        description: attendanceDescription,
        tone: isNotCounted ? 'neutral' : !isPresent || hasEarlyLeave ? 'warning' : 'success',
      });

      if (hasNote) {
        timelineEvents.push({
          id: `anote-${a.date}-${a.childId}`,
          date: a.date,
          type: 'note',
          title: 'Qeyd əlavə olundu',
          description: a.notes!.trim(),
          tone: 'neutral',
        });
      }
    }
  }

  timelineEvents.sort((a, b) => b.date.localeCompare(a.date));
  const latestEvent = timelineEvents[0];
  const latestPayment = [...payments].sort((a, b) => {
    const ay = a.year * 100 + a.month;
    const by = b.year * 100 + b.month;
    return by - ay;
  })[0];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white-border p-6 space-y-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!child) {
    return <p className="text-sm text-gray-400 text-center py-12">Uşaq tapılmadı.</p>;
  }

  return (
    <div>
      <ConfirmDeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        childName={`${child.firstName} ${child.lastName}`}
        loading={actionLoading}
      />
      <div className="relative rounded-2xl overflow-hidden mb-6 p-6 bg-gradient-to-br from-green-400/10 to-accent-blue/5 dark:from-green-400/5 dark:to-accent-blue/5 border border-white-border dark:border-gray-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between w-full">
          <div className="flex items-center gap-5">
            <Avatar name={`${child.firstName} ${child.lastName}`} size="2xl" ring />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 font-display">
                  {child.firstName} {child.lastName}
                </h2>
                <ChildStatusBadge isActive={child.status === 'Active'} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="blue" size="sm" className="px-2.5 py-1 text-xs">{child.divisionName}</Badge>
                {matchedGroupId ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/groups/${matchedGroupId}`)}
                    className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    title="Qrupu aç"
                  >
                    <Badge variant="violet" size="sm" className="px-2.5 py-1 text-xs hover:opacity-80 transition-opacity cursor-pointer">
                      {child.groupName}
                    </Badge>
                  </button>
                ) : (
                  <Badge variant="violet" size="sm" className="px-2.5 py-1 text-xs">{child.groupName}</Badge>
                )}
                <Badge variant="teal" size="sm" className="px-2.5 py-1 text-xs">
                  {child.scheduleType === 'FullDay' ? 'Tam günlük' : 'Yarım günlük'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-5 lg:mt-0 lg:justify-end w-full lg:w-auto">
            {/* Sənədlər */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                loading={downloadingAgreement}
                onClick={handleDownloadAgreement}
                className="text-blue-600 border-blue-200 bg-white hover:bg-blue-50 whitespace-nowrap shadow-sm"
              >
                {!downloadingAgreement && <Download size={14} />} Razılaşma
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={downloadingContract}
                onClick={handleDownloadContract}
                className="text-indigo-600 border-indigo-200 bg-white hover:bg-indigo-50 whitespace-nowrap shadow-sm"
              >
                {!downloadingContract && <Download size={14} />} Kontrakt
              </Button>
            </div>

            {/* Ayırıcı */}
            <div className="hidden lg:block w-px h-6 bg-gray-200/80 mx-1"></div>

            {/* CRUD Əməliyyatları */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit} className="bg-white text-gray-700 border-gray-200 hover:bg-gray-50 whitespace-nowrap shadow-sm">
                <Edit size={14} /> Düzəliş et
              </Button>
              {child.status === 'Inactive' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={handleToggleStatus}
                    className="text-green-600 border-green-300 bg-white hover:bg-green-50 justify-center whitespace-nowrap shadow-sm"
                  >
                    <UserCheck size={14} /> Aktiv et
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => setDeleteModalOpen(true)}
                    className="text-rose-500 border-rose-300 bg-white hover:bg-rose-50 whitespace-nowrap shadow-sm"
                  >
                    <Trash2 size={14} /> Sil
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={handleToggleStatus}
                  className="text-amber-600 border-amber-300 bg-white hover:bg-amber-50 whitespace-nowrap shadow-sm"
                >
                  <UserX size={14} /> Deaktiv et
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-50 dark:bg-[#1e2130]/60 p-1 rounded-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium rounded-lg transition-all',
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white-border dark:border-gray-700/60 p-4 sm:p-5 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.05),transparent_45%)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Zaman Xətti 360</p>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-50 font-display mt-0.5">Nə baş verib?</h4>
                </div>
                <Badge variant="blue" size="sm">Son 120 günün xülasəsi</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="rounded-xl border border-white-border dark:border-gray-700/60 bg-white/80 dark:bg-[#1e2130]/80 p-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Son hadisə</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 mt-1 line-clamp-1">{latestEvent?.title || 'Hadisə yoxdur'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{latestEvent ? formatDate(new Date(latestEvent.date), 'dd MMMM yyyy') : '-'}</p>
                </div>
                <div className="rounded-xl border border-white-border dark:border-gray-700/60 bg-white/80 dark:bg-[#1e2130]/80 p-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Son ödəniş statusu</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 mt-1 line-clamp-1">
                    {latestPayment ? getPaymentMeta(latestPayment.status).statusLabel : 'Ödəniş yoxdur'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {latestPayment ? `${AZ_MONTHS[latestPayment.month - 1]} ${latestPayment.year}` : '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-white-border dark:border-gray-700/60 bg-white/80 dark:bg-[#1e2130]/80 p-3">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">30 günlük davamiyyət</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 mt-1">{recent30Rate}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{recent30Present}/{recent30Attendance.length} gün iştirak</p>
                </div>
              </div>
            </div>

            <div className="relative pl-6 sm:pl-7">
              <div className="absolute left-[10px] sm:left-[12px] top-2 bottom-2 w-px bg-gradient-to-b from-accent-blue/40 via-green-300/40 to-accent-rose/40" />

              {timelineEvents.length === 0 && (
                <div className="rounded-xl border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] p-4 text-sm text-gray-500 dark:text-gray-400">
                  Hələ timeline hadisəsi yoxdur.
                </div>
              )}

              {timelineEvents.slice(0, 28).map((event) => {
                const Icon = getTimelineIcon(event.type);
                const style = EVENT_STYLE[event.tone];
                return (
                  <div key={event.id} className="relative mb-3">
                    <span className={cn('absolute -left-6 sm:-left-7 top-5 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#1e2130]', style.dot)} />
                    <div className={cn('flex items-start gap-3 rounded-xl border p-3.5 shadow-sm', style.card)}>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', style.icon)}>
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{event.title}</p>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">{formatDate(new Date(event.date), 'dd MMM yyyy')}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{event.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {timelineEvents.length > 28 && (
                <div className="pt-1 text-xs text-gray-400">
                  +{timelineEvents.length - 28} köhnə hadisə gizlədildi.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon={User}       label="Ad Soyad"          value={`${child.firstName} ${child.lastName}`} />
            <InfoCard icon={Calendar}   label="Doğum tarixi"      value={formatDate(new Date(child.dateOfBirth), 'dd MMMM yyyy')} />
            <InfoCard icon={Calendar}   label="Qeydiyyat tarixi"  value={child.registrationDate ? formatDate(new Date(child.registrationDate), 'dd MMMM yyyy') : '-'} />
            <InfoCard icon={Calendar}   label="Deaktiv tarixi"    value={child.deactivationDate ? formatDate(new Date(child.deactivationDate), 'dd MMMM yyyy') : '-'} />
            <InfoCard icon={Phone}      label="Valideyn telefonu" value={formatPhone(child.parentPhone)} />
            <InfoCard icon={Mail}       label="E-poçt"            value={child.parentEmail || '-'} />
            <InfoCard icon={User}       label="Valideyn adı"      value={child.parentFullName} />
            <InfoCard icon={User}       label="Əlavə valideyn"    value={child.secondParentFullName || '-'} />
            <InfoCard icon={Phone}      label="Əlavə telefon"     value={child.secondParentPhone ? formatPhone(child.secondParentPhone) : '-'} />
            <InfoCard icon={DollarSign} label="Aylıq ödəniş"      value={formatCurrency(child.monthlyFee)} />
            <InfoCard icon={Calendar}   label="Ödəniş günü"       value={`${child.paymentDay}-i`} />
            <InfoCard icon={BookOpen}   label="Bölmə"             value={child.divisionName} />
            <InfoCard icon={Clock}      label="Müəllim"           value={child.teacherName || '-'} />
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 font-display">{presentDays}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gəldi</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-accent-rose dark:text-rose-400 font-display">{absentDays}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gəlmədi</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-accent-blue dark:text-blue-400 font-display">
                  {workDays > 0 ? Math.round((presentDays / workDays) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Davamiyyət</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-violet-500 dark:text-violet-400 font-display">{notCountedDays}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sayılmır</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4 sm:p-5 shadow-sm">
              {/* Month navigator */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[110px] text-center">
                    {format(calendarMonth, 'MMMM yyyy')}
                  </h4>
                  <button
                    onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                    disabled={isSameMonth(calendarMonth, new Date())}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
                {!isSameMonth(calendarMonth, new Date()) && (
                  <button
                    onClick={() => setCalendarMonth(startOfMonth(new Date()))}
                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
                  >
                    Bu ay
                  </button>
                )}
              </div>

              {monthAttLoading ? (
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['B.e','C.a','C','Ca','Cu','S','B'].map((d) => (
                      <div key={d} className="text-center text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: (startOfMonth(calendarMonth).getDay() + 6) % 7 }).map((_, i) => (
                      <div key={`pad-${i}`} className="aspect-square rounded-xl bg-transparent" />
                    ))}
                    {heatmap.map((d, i) => (
                      <div
                        key={i}
                        title={`${d.date}${d.status === 'not_counted' ? ' · Sayılmır' : ''}`}
                        className={cn(
                          'aspect-square rounded-xl flex items-center justify-center text-sm font-semibold transition-transform hover:scale-[1.03]',
                          statusColor[d.status],
                          d.isToday && 'ring-2 ring-accent-blue shadow-sm'
                        )}
                      >
                        <span>{d.dayNumber}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white-border dark:border-gray-700/60">
                {[
                  { color: 'bg-green-100 dark:bg-green-900/40 ring-1 ring-green-200 dark:ring-green-900/50',   label: 'Gəldi'                       },
                  { color: 'bg-rose-100 dark:bg-rose-900/40 ring-1 ring-rose-200 dark:ring-rose-900/50',     label: 'Gəlmədi'                     },
                  { color: 'bg-violet-100 dark:bg-violet-900/40 ring-1 ring-violet-200 dark:ring-violet-900/50', label: 'Sayılmır (Ş/B, bayram)'      },
                  { color: 'bg-gray-50 dark:bg-gray-800/50 ring-1 ring-gray-100 dark:ring-gray-700/50',      label: 'Gələcək / Qeydiyyatdan əvvəl'},
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={cn('w-3 h-3 rounded-sm', l.color)} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl overflow-hidden shadow-sm">
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Ödəniş tapılmadı.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700/60">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-xs">Ay / İl</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-xs">Məbləğ</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-xs hidden sm:table-cell">Ödənilib</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-xs hidden sm:table-cell">Qalıq</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {payments.map((p) => {
                      const { statusLabel, statusVariant } = getPaymentMeta(p.status);
                      return (
                        <tr key={p.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                              <div>{AZ_MONTHS[p.month - 1]} {p.year}</div>
                              {p.paymentDate && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                                  {formatDate(p.paymentDate, "dd.MM.yyyy")}
                                </div>
                              )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-50">
                            {formatCurrency(p.finalAmount)}
                          </td>
                          <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium hidden sm:table-cell">
                            {formatCurrency(p.paidAmount)}
                          </td>
                          <td className="px-4 py-3 text-rose-500 dark:text-rose-400 font-medium hidden sm:table-cell">
                            <span className={p.remainingDebt > 0 ? '' : 'text-gray-400 dark:text-gray-500 font-normal'}>
                              {formatCurrency(p.remainingDebt)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant as 'paid' | 'partial' | 'unpaid'} size="sm" className="whitespace-nowrap">
                              {statusLabel}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            <textarea
              className="w-full h-32 p-3 text-sm border border-white-border dark:border-gray-700/60 dark:bg-[#1e2130] rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-500 resize-none dark:text-gray-100"
              placeholder="Bu uşaq haqqında qeydlər..."
            />
            <Button className="w-full">Yadda saxla</Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-xl">
      <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-green-600 dark:text-green-400" />
      </div>
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
