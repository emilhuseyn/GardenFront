'use client';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Scan, Users, CheckCircle, XCircle, Clock, CalendarDays } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { az } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchBar } from '@/components/ui/SearchBar';
import { AttendanceRow, type AttendanceRowData, type AttendanceStatus } from '@/components/attendance/AttendanceRow';
import { cn } from '@/lib/utils/constants';
import { groupsApi } from '@/lib/api/groups';
import { childrenApi } from '@/lib/api/children';
import { attendanceApi } from '@/lib/api/attendance';
import { schedulesApi } from '@/lib/api/schedules';
import type { Group, ScheduleConfig } from '@/types';

function getBakuTimeHHmm() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Baku',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function AttendanceGrid() {
  const [date, setDate] = useState(new Date());
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState<AttendanceRowData[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingRows, setLoadingRows] = useState(true);
  const [facePanel, setFacePanel] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'present' | 'late' | 'absent' | 'unmarked'>('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [bulkCheckInTime, setBulkCheckInTime] = useState(() => getBakuTimeHHmm());
  const customDateInputRef = useRef<HTMLInputElement>(null);
  const [scheduleMap, setScheduleMap] = useState<Record<string, { startTime: string; endTime: string }>>({
    FullDay: { startTime: '09:00', endTime: '18:00' },
    HalfDay: { startTime: '09:00', endTime: '13:00' },
  });

  const SORT_OPTIONS = [
    { value: 'name_asc', label: 'Ad (A-Z)' },
    { value: 'name_desc', label: 'Ad (Z-A)' },
    { value: 'status', label: 'Status (gəlmə/gecikmə/gəlməyən)' },
    { value: 'group_asc', label: 'Qrup (A-Z)' },
  ];

  const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'Bütün statuslar' },
    { value: 'present', label: 'Gəldilər' },
    { value: 'late', label: 'Gecikmə' },
    { value: 'absent', label: 'Gəlmədilər' },
    { value: 'unmarked', label: 'Qeyd edilməmiş' },
  ];

  const TIME_OPTIONS = useMemo(
    () =>
      Array.from({ length: 96 }, (_, i) => {
        const hour = String(Math.floor(i / 4)).padStart(2, '0');
        const minute = String((i % 4) * 15).padStart(2, '0');
        const value = `${hour}:${minute}`;
        return { value, label: value };
      }),
    []
  );

  useEffect(() => {
    groupsApi.getAll().then(setGroups).catch(() => {});
    schedulesApi
      .getAll()
      .then((configs) => {
        const map: Record<string, { startTime: string; endTime: string }> = {
          FullDay: { startTime: '09:00', endTime: '18:00' },
          HalfDay: { startTime: '09:00', endTime: '13:00' },
        };
        configs.forEach((c: ScheduleConfig) => {
          map[c.scheduleType] = { startTime: c.startTime, endTime: c.endTime };
        });
        setScheduleMap(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingRows(true);
    const dateStr = format(date, 'yyyy-MM-dd');

    Promise.all([
      childrenApi.getAll({ groupId: selectedGroupId ?? undefined, status: 'Active', pageSize: 200 }),
      attendanceApi.getDaily(dateStr, selectedGroupId ?? undefined),
    ])
      .then(([childrenResult, daily]) => {
        const entryMap = new Map(daily.entries.map((e) => [e.childId, e]));
        const eligibleChildren = childrenResult.items.filter((child) => {
          if (!child.registrationDate) return true;
          const registeredOn = child.registrationDate.slice(0, 10);
          return dateStr >= registeredOn;
        });

        const mapped: AttendanceRowData[] = eligibleChildren.map((child) => {
          const entry = entryMap.get(child.id);
          const sched = scheduleMap[child.scheduleType] ?? scheduleMap.FullDay;
          const parseTimeMins = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
          };

          let status: AttendanceStatus = null;
          if (entry) {
            if (!entry.isPresent) {
              status = 'absent';
            } else if (entry.arrivalTime && sched) {
              status = parseTimeMins(entry.arrivalTime) > parseTimeMins(sched.startTime) + 15 ? 'late' : 'present';
            } else {
              status = entry.isLate ? 'late' : 'present';
            }
          }

          const isEarlyLeave = !!(
            entry?.departureTime &&
            sched &&
            parseTimeMins(entry.departureTime) < parseTimeMins(sched.endTime) - 30
          );

          return {
            id: String(child.id),
            firstName: child.firstName,
            lastName: child.lastName,
            groupName: child.groupName,
            scheduleStartTime: sched?.startTime,
            scheduleEndTime: sched?.endTime,
            checkIn: entry?.arrivalTime,
            checkOut: entry?.departureTime,
            status,
            isEarlyLeave,
          };
        });

        setRows(mapped);
      })
      .catch(() => setRows([]))
      .finally(() => setLoadingRows(false));
  }, [date, selectedGroupId, scheduleMap]);

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const handleCustomDateChange = (value: string) => {
    if (!value) return;
    setDate(new Date(`${value}T00:00:00`));
  };

  const openDatePicker = () => {
    const input = customDateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const handleChange = useCallback((id: string, field: 'status' | 'checkIn' | 'checkOut', value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const updated: AttendanceRowData = {
          ...r,
          [field]: value || undefined,
          ...(field === 'status' && !value ? { checkIn: undefined, checkOut: undefined, isEarlyLeave: false } : {}),
        };

        if (field === 'checkIn' && value && r.scheduleStartTime && updated.status !== 'absent') {
          const arrMins = parseTime(value);
          const startMins = parseTime(r.scheduleStartTime);
          updated.status = arrMins > startMins + 15 ? 'late' : 'present';
        }

        if (field === 'checkOut' && r.scheduleEndTime) {
          updated.isEarlyLeave = !!(value && parseTime(value) < parseTime(r.scheduleEndTime) - 30);
        }

        return updated;
      })
    );
  }, []);

  const handleToggleEarlyLeave = useCallback((id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isEarlyLeave: !r.isEarlyLeave } : r)));
  }, []);

  const handleMarkAllPresent = useCallback(() => {
    const appliedCheckIn = bulkCheckInTime || (isToday(date) ? getBakuTimeHHmm() : '09:00');
    setRows((prev) =>
      prev.map((r) => {
        return {
          ...r,
          status: 'present',
          checkIn: appliedCheckIn,
          checkOut: r.status === 'absent' ? undefined : r.checkOut,
          isEarlyLeave: false,
        };
      })
    );
    toast.success(`Siyahıda hamı "Gəldi" kimi işarələndi (${appliedCheckIn})`);
  }, [bulkCheckInTime, date]);

  const handleMarkAllAbsent = useCallback(() => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.status === 'absent' && !r.checkIn && !r.checkOut && !r.isEarlyLeave) return r;
        return {
          ...r,
          status: 'absent',
          checkIn: undefined,
          checkOut: undefined,
          isEarlyLeave: false,
        };
      })
    );
    toast.success('Siyahıda hamı "Gəlmədi" kimi işarələndi');
  }, []);

  const processedRows = useMemo(() => {
    let filtered = [...rows];

    if (statusFilter) {
      if (statusFilter === 'unmarked') {
        filtered = filtered.filter((r) => r.status === null);
      } else {
        filtered = filtered.filter((r) => r.status === statusFilter);
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) => `${r.firstName} ${r.lastName}`.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.trim();
      const nameB = `${b.firstName} ${b.lastName}`.trim();
      const groupA = a.groupName ?? '';
      const groupB = b.groupName ?? '';

      switch (sortBy) {
        case 'name_desc':
          return nameB.localeCompare(nameA, 'az');
        case 'status': {
          const getStatusOrder = (status: AttendanceStatus | null): number => {
            if (status === 'present') return 0;
            if (status === 'late') return 1;
            if (status === 'absent') return 2;
            return 3;
          };

          const orderA = getStatusOrder(a.status);
          const orderB = getStatusOrder(b.status);
          if (orderA !== orderB) return orderA - orderB;
          return nameA.localeCompare(nameB, 'az');
        }
        case 'group_asc':
          if (groupA !== groupB) return groupA.localeCompare(groupB, 'az');
          return nameA.localeCompare(nameB, 'az');
        case 'name_asc':
        default:
          return nameA.localeCompare(nameB, 'az');
      }
    });

    return filtered;
  }, [rows, search, statusFilter, sortBy]);

  const handleSave = async () => {
    setSaving(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      const toTimeOnly = (t?: string) => (t ? (t.length === 5 ? `${t}:00` : t) : undefined);

      const entries = rows
        .filter((r) => r.status !== null)
        .map((r) => ({
          childId: Number(r.id),
          date: dateStr,
          isPresent: r.status === 'present' || r.status === 'late',
          isLate: r.status === 'late',
          arrivalTime: toTimeOnly(r.checkIn),
          departureTime: toTimeOnly(r.checkOut),
        }));
      await attendanceApi.mark(entries);
      toast.success('Davamiyyət yadda saxlanıldı');
    } catch {
      toast.error('Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = rows.filter((r) => r.status === 'present').length;
  const lateCount = rows.filter((r) => r.status === 'late').length;
  const absentCount = rows.filter((r) => r.status === 'absent').length;
  const totalCount = rows.length;

  return (
    <div>
      <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setDate((d) => subDays(d, 1))} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <ChevronLeft size={16} className="text-gray-400" />
            </button>
            <div className="text-center min-w-40 sm:min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{format(date, 'd MMMM yyyy', { locale: az })}</p>
              {isToday(date) && <p className="text-xs text-green-600 font-medium">Bu gün</p>}
            </div>
            <button onClick={() => setDate((d) => addDays(d, 1))} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white-border dark:border-gray-700/60 bg-gray-50/70 dark:bg-gray-800/40 px-2.5 py-1.5">
            <CalendarDays size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Tarix</span>
            <input
              ref={customDateInputRef}
              type="date"
              value={format(date, 'yyyy-MM-dd')}
              onChange={(e) => handleCustomDateChange(e.target.value)}
              className="sr-only"
            />
            <button
              type="button"
              onClick={openDatePicker}
              className="h-8 px-2.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors whitespace-nowrap"
            >
              {format(date, 'dd.MM.yyyy')}
            </button>
            <button
              onClick={() => setDate((d) => subDays(d, 1))}
              className="h-8 px-2 rounded-lg text-xs font-medium text-gray-500 bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors whitespace-nowrap"
            >
              Dünən
            </button>
            {!isToday(date) && (
              <button
                onClick={() => setDate(new Date())}
                className="h-8 px-2 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors whitespace-nowrap"
              >
                Bu gün
              </button>
            )}
            <button
              onClick={() => setDate((d) => addDays(d, 1))}
              className="h-8 px-2 rounded-lg text-xs font-medium text-gray-500 bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors whitespace-nowrap"
            >
              Sabah
            </button>
          </div>

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as '' | 'present' | 'late' | 'absent' | 'unmarked')}
              options={STATUS_FILTER_OPTIONS}
              className="w-full sm:w-44"
            />
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={SORT_OPTIONS} className="w-full sm:w-52" />
            {rows.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] px-2 py-1 h-9">
                  <span className="text-[11px] text-gray-500 whitespace-nowrap">Gəliş saatı</span>
                  <Select
                    value={bulkCheckInTime}
                    onChange={(e) => setBulkCheckInTime(e.target.value)}
                    options={TIME_OPTIONS}
                    className="h-7 min-w-[84px] !pl-2 !pr-6 !text-xs !border-white-border dark:!border-gray-700/60 !bg-white dark:!bg-[#1e2130]"
                  />
                  <button
                    type="button"
                    onClick={() => setBulkCheckInTime(getBakuTimeHHmm())}
                    className="h-7 px-2 rounded-md text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors whitespace-nowrap"
                  >
                    İndi (AZT)
                  </button>
                </div>
                <Button size="sm" variant="secondary" className="shrink-0" onClick={handleMarkAllPresent}>
                  Hamısı gəldi
                </Button>
                <Button size="sm" variant="secondary" className="shrink-0" onClick={handleMarkAllAbsent}>
                  Hamısı gəlmədi
                </Button>
              </>
            )}
            <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setFacePanel(!facePanel)}>
              <Scan size={14} /> FaceID
            </Button>
            <Button size="sm" className="shrink-0" loading={saving} onClick={handleSave}>
              <Save size={14} /> Yadda saxla
            </Button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelected(null)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all',
              selectedGroupId === null
                ? 'bg-green-400 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            )}
          >
            Bütün qruplar
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelected(g.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all',
                selectedGroupId === g.id
                  ? 'bg-green-400 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Uşağın adı ilə axtar..."
            className="w-full sm:w-80"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-3 border-t border-white-border dark:border-gray-700/60">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
            <Users size={13} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{totalCount} uşaq</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle size={13} className="text-green-500" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">{presentCount} gəldi</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <Clock size={13} className="text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{lateCount} gecikmə</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
            <XCircle size={13} className="text-rose-500" />
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400">{absentCount} gəlmədi</span>
          </div>
          {totalCount > 0 && (
            <div className="sm:ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-xs font-medium text-accent-blue">
                {Math.round(((presentCount + lateCount) / totalCount) * 100)}% davamiyyət
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-white-border dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Uşaq</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Giriş</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Çıxış</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Cari status</th>
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-white-border dark:border-gray-700/40">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-14" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-14" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))
                ) : (
                  processedRows.map((row, i) => (
                    <AttendanceRow key={row.id} row={row} index={i} onChange={handleChange} onToggleEarlyLeave={handleToggleEarlyLeave} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loadingRows && processedRows.length === 0 && rows.length > 0 && (
            <div className="text-center py-12 text-sm text-gray-400">Bu filtrə uyğun uşaq yoxdur</div>
          )}
          {!loadingRows && rows.length === 0 && <div className="text-center py-12 text-sm text-gray-400">Bu qrupda uşaq yoxdur</div>}
        </div>

        {facePanel && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white border border-white-border rounded-2xl p-4 shrink-0 w-full xl:w-70 h-fit"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">FaceID Paneli</h3>
              <button onClick={() => setFacePanel(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">x</button>
            </div>
            <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center mb-3">
              <div className="text-center">
                <Scan size={32} className="text-green-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Kamera hazırdır</p>
              </div>
            </div>
            <Button className="w-full" size="sm">
              Skan et
            </Button>
            <p className="text-xs text-center text-gray-400 mt-2">Uşağın üzünü kameraya yönləndiyin</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
