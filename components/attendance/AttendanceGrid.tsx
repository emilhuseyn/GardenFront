'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Users, CheckCircle, XCircle } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchBar } from '@/components/ui/SearchBar';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimeInput } from '@/components/attendance/TimeInput';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'present' | 'absent' | 'not_counted' | 'unmarked'>('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [bulkCheckInTime, setBulkCheckInTime] = useState(() => getBakuTimeHHmm());
  const [scheduleMap, setScheduleMap] = useState<Record<string, { startTime: string; endTime: string }>>({
    FullDay: { startTime: '09:00', endTime: '18:00' },
    HalfDay: { startTime: '09:00', endTime: '13:00' },
  });

  const SORT_OPTIONS = [
    { value: 'name_asc', label: 'Ad (A-Z)' },
    { value: 'name_desc', label: 'Ad (Z-A)' },
    { value: 'status', label: 'Status (gəldi/gəlmədi/sayılmır)' },
    { value: 'group_asc', label: 'Qrup (A-Z)' },
  ];

  const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'Bütün statuslar' },
    { value: 'present', label: 'Gəldilər' },
    { value: 'absent', label: 'Gəlmədilər' },
    { value: 'not_counted', label: 'Sayılmır' },
    { value: 'unmarked', label: 'Qeyd edilməmiş' },
  ];

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
      Promise.all([
        childrenApi.getAll({ groupId: selectedGroupId ?? undefined, status: 'Active', pageSize: 0 }),
        childrenApi.getAll({ groupId: selectedGroupId ?? undefined, status: 'Inactive', pageSize: 0 }),
      ]),
      attendanceApi.getDaily(dateStr, selectedGroupId ?? undefined),
    ])
      .then(([[activeResult, inactiveResult], daily]) => {
        const children = Array.from(
          new Map([...activeResult.items, ...inactiveResult.items].map((child) => [child.id, child])).values()
        );
        const entryMap = new Map(daily.entries.map((e) => [e.childId, e]));

        const parseDateOnly = (value?: string | null) => {
          if (!value) return null;
          const parsed = new Date(`${value}T00:00:00`);
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        };
        const selectedDate = parseDateOnly(dateStr);

        const visibleChildren = children.filter((child) => {
          if (child.status === 'Active') return true;
          if (entryMap.has(child.id)) return true;
          if (!selectedDate) return false;

          const registrationDate = parseDateOnly(child.registrationDate);
          const deactivationDate = parseDateOnly(child.deactivationDate);

          if (registrationDate && selectedDate < registrationDate) return false;
          if (!deactivationDate) return false;

          return selectedDate <= deactivationDate;
        });

        const mapped: AttendanceRowData[] = visibleChildren.map((child) => {
          const entry = entryMap.get(child.id);
          const sched = scheduleMap[child.scheduleType] ?? scheduleMap.FullDay;
          const parseTimeMins = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
          };

          let status: AttendanceStatus = null;
          if (entry) {
            if (entry.status === 4) {
              status = 'not_counted';
            } else if (entry.status === 2 || entry.status === 3) {
              status = 'absent';
            } else {
              status = 'present';
            }
          }

          const isEarlyLeave = !!(
            entry?.departureTime &&
            sched &&
            parseTimeMins(entry.departureTime) < parseTimeMins(sched.endTime) - 30
          );

          const src = entry?.recordSource as 'manual' | 'faceid' | 'auto' | undefined;

          return {
            id: String(child.id),
            personId: child.personId ?? null,
            firstName: child.firstName,
            lastName: child.lastName,
            groupName: child.groupName,
            childStatus: child.status,
            scheduleStartTime: sched?.startTime,
            scheduleEndTime: sched?.endTime,
            checkIn: entry?.arrivalTime,
            checkOut: entry?.departureTime,
            status,
            isEarlyLeave,
            recordSource: entry ? (src ?? 'manual') : undefined,
            recordedByName: entry?.recordedByName ?? undefined,
            recordedAt: entry?.recordedAt ?? undefined,
            date: dateStr,
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

  const handleBulkTimeChange = (value: string) => {
    setBulkCheckInTime(value);
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

        if (field === 'checkIn' && value && updated.status !== 'absent' && updated.status !== 'not_counted') {
          updated.status = 'present';
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
        return { ...r, status: 'absent', checkIn: undefined, checkOut: undefined, isEarlyLeave: false };
      })
    );
    toast.success('Siyahıda hamı "Gəlmədi" kimi işarələndi');
  }, []);

  const handleMarkAllNotCounted = useCallback(() => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.status === 'not_counted' && !r.checkIn && !r.checkOut) return r;
        return { ...r, status: 'not_counted', checkIn: undefined, checkOut: undefined, isEarlyLeave: false };
      })
    );
    toast.success('Siyahıda hamı "Sayılmır" kimi işarələndi');
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
            if (status === 'absent') return 1;
            if (status === 'not_counted') return 2;
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

      const toStatus = (s: AttendanceStatus): 1 | 2 | 4 => {
        if (s === 'present') return 1;
        if (s === 'not_counted') return 4;
        return 2; // absent
      };

      const entries = rows
        .filter((r) => r.status !== null)
        .map((r) => ({
          childId: Number(r.id),
          date: dateStr,
          status: toStatus(r.status),
          isLate: false,
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

  const presentCount    = rows.filter((r) => r.status === 'present').length;
  const absentCount     = rows.filter((r) => r.status === 'absent').length;
  const notCountedCount = rows.filter((r) => r.status === 'not_counted').length;
  const totalCount      = rows.length - notCountedCount;

  return (
    <div>
      <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4 sm:p-5 mb-5 shadow-sm flex flex-col gap-5">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          {/* Beautiful Date Picker */}
          <div className="flex items-center gap-1 bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-1 border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
            <button
              onClick={() => setDate((d) => subDays(d, 1))}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded-lg transition-all"
              title="Əvvəlki gün"
            >
              <ChevronLeft size={16} />
            </button>
            
            <DatePicker date={date} onDateChange={setDate} />
            
            <button
              onClick={() => setDate((d) => addDays(d, 1))}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded-lg transition-all"
              title="növbəti gün"
            >
              <ChevronRight size={16} />
            </button>
            
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"></div>
            
            <button
              onClick={() => setDate(new Date())}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                isToday(date)
                  ? "bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm"
                  : "text-gray-500 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200"
              )}
            >
              Bu gün
            </button>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-2.5 sm:ml-auto w-full sm:w-auto">
            <Button size="sm" className="flex-1 sm:flex-none" loading={saving} onClick={handleSave}>
              <Save size={15} /> Yadda saxla
            </Button>
          </div>
        </div>

        {/* Bulk Actions - elegantly styled */}
        {rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/30 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-blue-900/70 dark:text-blue-300/70 uppercase tracking-wider shrink-0">
                Toplu Əməliyyatlar
              </span>
              
              <div className="flex items-center gap-2 bg-white dark:bg-[#1e2130] rounded-lg p-1 border border-blue-100/50 dark:border-blue-800/30 shadow-sm shrink-0">
                <span className="text-xs text-gray-500 px-2 font-medium">Gəliş saatı:</span>
                <div className="flex items-center bg-gray-50 dark:bg-gray-800/60 rounded px-2 py-1 gap-1.5 border border-gray-100 dark:border-gray-700/50">
                  <TimeInput
                    value={bulkCheckInTime}
                    onChange={handleBulkTimeChange}
                    className="!h-6 !w-[56px] !rounded !bg-transparent !border-none !px-0 !py-0 !text-sm !font-bold !text-gray-800 dark:!text-gray-100 focus:!ring-0 text-center"
                  />
                 
                </div>
                <button
                  type="button"
                  onClick={() => setBulkCheckInTime(getBakuTimeHHmm())}
                  className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                >
                  İndi
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none bg-white dark:bg-[#1e2130] border-gray-200 dark:border-gray-700/60 hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:hover:bg-green-900/30 dark:hover:text-green-400 py-1.5 h-auto text-xs sm:text-sm"
                onClick={handleMarkAllPresent}
              >
                <CheckCircle size={15} className="mr-1.5 sm:mr-2 text-green-500" /> Hamısı gəldi
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none bg-white dark:bg-[#1e2130] border-gray-200 dark:border-gray-700/60 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 py-1.5 h-auto text-xs sm:text-sm"
                onClick={handleMarkAllAbsent}
              >
                <XCircle size={15} className="mr-1.5 sm:mr-2 text-rose-500" /> Hamısı gəlmədi
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none bg-white dark:bg-[#1e2130] border-gray-200 dark:border-gray-700/60 hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300 dark:hover:bg-gray-700/40 dark:hover:text-gray-300 py-1.5 h-auto text-xs sm:text-sm"
                onClick={handleMarkAllNotCounted}
              >
                <XCircle size={15} className="mr-1.5 sm:mr-2 text-gray-400" /> Hamısı sayılmır
              </Button>
            </div>
          </div>
        )}

        {/* Groups & Filters Container */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelected(null)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all border',
                selectedGroupId === null
                  ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100 shadow-sm'
                  : 'bg-white dark:bg-[#1e2130] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              Bütün qruplar
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelected(g.id)}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all border',
                  selectedGroupId === g.id
                    ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100 shadow-sm'
                    : 'bg-white dark:bg-[#1e2130] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                {g.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Uşağın adı ilə axtar..."
              className="w-full md:flex-1 md:min-w-[340px]"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as '' | 'present' | 'absent' | 'not_counted' | 'unmarked')}
              options={STATUS_FILTER_OPTIONS}
              className="w-full md:w-44"
            />
            <Select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              options={SORT_OPTIONS} 
              className="w-full md:w-48" 
            />
          </div>
        </div>

        {/* Status Highlights */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-700/40">
            <Users size={14} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{totalCount} uşaq</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50/80 dark:bg-green-900/10 rounded-lg border border-green-100/50 dark:border-green-900/30">
            <CheckCircle size={14} className="text-green-500" />
            <span className="text-xs font-semibold text-green-700 dark:text-green-400">{presentCount} gəldi</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50/80 dark:bg-rose-900/10 rounded-lg border border-rose-100/50 dark:border-rose-900/30">
            <XCircle size={14} className="text-rose-500" />
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">{absentCount} gəlmədi</span>
          </div>
          {notCountedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/40 rounded-lg border border-gray-200/50 dark:border-gray-700/40">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{notCountedCount} sayılmır</span>
            </div>
          )}
          {totalCount > 0 && (
            <div className="sm:ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
              <span className="text-xs font-bold text-accent-blue dark:text-blue-400">
                {Math.round((presentCount / totalCount) * 100)}% davamiyyət
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">IVMS ID</th>
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
      </div>
    </div>
  );
}
