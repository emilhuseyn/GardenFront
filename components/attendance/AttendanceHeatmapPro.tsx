'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Brain, TrendingUp } from 'lucide-react';
import { attendanceApi } from '@/lib/api/attendance';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/constants';
import type { Group } from '@/types';

type WeekdayCell = {
  groupId: number;
  weekday: number;
  total: number;
  late: number;
  absent: number;
};

type WeekdaySummary = {
  weekday: number;
  total: number;
  late: number;
  absent: number;
};

type GroupRow = {
  groupId: number;
  groupName: string;
  cells: Array<{
    weekday: number;
    issueRate: number;
    lateRate: number;
    absentRate: number;
    sampleSize: number;
  }>;
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_LABELS: Record<number, string> = {
  1: 'B.e',
  2: 'Ç.a',
  3: 'Ç',
  4: 'C.a',
  5: 'C',
  6: 'Ş',
  0: 'B',
};

function getMonthDates(month: number, year: number): string[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const endDay = isCurrentMonth ? Math.min(daysInMonth, now.getDate()) : daysInMonth;

  return Array.from({ length: endDay }, (_, idx) => {
    const d = new Date(year, month - 1, idx + 1);
    return format(d, 'yyyy-MM-dd');
  });
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function cellTone(issueRate: number): string {
  if (issueRate >= 35) return 'bg-rose-200 text-rose-900 border-rose-300';
  if (issueRate >= 24) return 'bg-amber-200 text-amber-900 border-amber-300';
  if (issueRate >= 14) return 'bg-blue-100 text-blue-900 border-blue-200';
  return 'bg-green-100 text-green-800 border-green-200';
}

interface AttendanceHeatmapProProps {
  groups: Group[];
  month: number;
  year: number;
  selectedGroupId?: number | null;
}

export function AttendanceHeatmapPro({ groups, month, year, selectedGroupId = null }: AttendanceHeatmapProProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [weekdaySummary, setWeekdaySummary] = useState<WeekdaySummary[]>([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (groups.length === 0) {
        setRows([]);
        setWeekdaySummary([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const dates = getMonthDates(month, year);
      const scopedGroups = selectedGroupId
        ? groups.filter((g) => g.id === selectedGroupId)
        : groups.slice(0, 12);

      const cellMap = new Map<string, WeekdayCell>();

      await Promise.allSettled(
        scopedGroups.flatMap((group) =>
          dates.map(async (date) => {
            try {
              const daily = await attendanceApi.getDaily(date, group.id, { silentError: true });
              const weekday = new Date(date).getDay();
              const key = `${group.id}-${weekday}`;
              const prev = cellMap.get(key) ?? {
                groupId: group.id,
                weekday,
                total: 0,
                late: 0,
                absent: 0,
              };

              const total = Math.max(daily.totalChildren, daily.entries.length);
              prev.total += total;
              prev.late += daily.lateCount;
              prev.absent += daily.absentCount;
              cellMap.set(key, prev);
            } catch {
              // Silent mode: failed days are skipped from behavior analysis.
            }
          })
        )
      );

      const byGroup: GroupRow[] = scopedGroups.map((group) => {
        const cells = DAY_ORDER.map((weekday) => {
          const raw = cellMap.get(`${group.id}-${weekday}`) ?? {
            groupId: group.id,
            weekday,
            total: 0,
            late: 0,
            absent: 0,
          };
          const issueRate = safeRate(raw.late + raw.absent, raw.total);
          const lateRate = safeRate(raw.late, raw.total);
          const absentRate = safeRate(raw.absent, raw.total);

          return {
            weekday,
            issueRate,
            lateRate,
            absentRate,
            sampleSize: raw.total,
          };
        });

        return {
          groupId: group.id,
          groupName: group.name,
          cells,
        };
      });

      const summary: WeekdaySummary[] = DAY_ORDER.map((weekday) => {
        const buckets = byGroup.map((g) => g.cells.find((c) => c.weekday === weekday)).filter(Boolean);
        const total = buckets.reduce((sum, c) => sum + (c?.sampleSize ?? 0), 0);
        const late = buckets.reduce((sum, c) => sum + Math.round(((c?.lateRate ?? 0) / 100) * (c?.sampleSize ?? 0)), 0);
        const absent = buckets.reduce((sum, c) => sum + Math.round(((c?.absentRate ?? 0) / 100) * (c?.sampleSize ?? 0)), 0);

        return { weekday, total, late, absent };
      });

      if (!cancelled) {
        setRows(byGroup);
        setWeekdaySummary(summary);
        setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [groups, month, year, selectedGroupId]);

  const insights = useMemo(() => {
    if (weekdaySummary.length === 0) return [] as string[];

    const withRates = weekdaySummary.map((d) => ({
      ...d,
      issueRate: safeRate(d.late + d.absent, d.total),
      lateRate: safeRate(d.late, d.total),
      absentRate: safeRate(d.absent, d.total),
    }));

    const worstIssueDay = [...withRates].sort((a, b) => b.issueRate - a.issueRate)[0];
    const worstLateDay = [...withRates].sort((a, b) => b.lateRate - a.lateRate)[0];
    const avgIssue = withRates.reduce((sum, d) => sum + d.issueRate, 0) / Math.max(withRates.length, 1);

    const notes: string[] = [];

    if (worstIssueDay && worstIssueDay.weekday === 1 && worstIssueDay.issueRate >= avgIssue + 6) {
      notes.push(`Bazar ertəsi sindromu: həftə ortalamasından ${Math.round(worstIssueDay.issueRate - avgIssue)}% daha çox gecikmə/gəlməmə var.`);
    }

    if (worstLateDay && worstLateDay.lateRate >= 12) {
      notes.push(`${DAY_LABELS[worstLateDay.weekday]} günləri gecikmə pik edir (${Math.round(worstLateDay.lateRate)}%).`);
    }

    if (notes.length === 0 && worstIssueDay) {
      notes.push(`Ən problemli gün ${DAY_LABELS[worstIssueDay.weekday]} görünür (${Math.round(worstIssueDay.issueRate)}% davranış riski).`);
    }

    const hottestCell = rows
      .flatMap((r) => r.cells.map((c) => ({ groupName: r.groupName, ...c })))
      .sort((a, b) => b.issueRate - a.issueRate)[0];

    if (hottestCell && hottestCell.issueRate >= 24) {
      notes.push(`${hottestCell.groupName} qrupunda ${DAY_LABELS[hottestCell.weekday]} daha riskli zonadır (${Math.round(hottestCell.issueRate)}%).`);
    }

    return notes.slice(0, 3);
  }, [weekdaySummary, rows]);

  const riskyWeekdays = useMemo(() => {
    return weekdaySummary
      .map((d) => ({ weekday: d.weekday, issueRate: safeRate(d.late + d.absent, d.total) }))
      .filter((d) => d.issueRate >= 24)
      .sort((a, b) => b.issueRate - a.issueRate);
  }, [weekdaySummary]);

  return (
    <Card padding="md" className="overflow-hidden">
      <CardHeader className="mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <Brain size={16} />
          </div>
          <div>
            <CardTitle>Davamiyyət İstilik Xəritəsi</CardTitle>
            <p className="text-xs text-gray-500">Qruplar üzrə həftəlik davranış nümunə analizi</p>
          </div>
        </div>
        <Badge variant="violet" size="sm">Nümunə mühərriki</Badge>
      </CardHeader>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">İstilik xəritəsi üçün məlumat tapılmadı.</p>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[220px_repeat(7,minmax(64px,1fr))] gap-1.5 mb-1.5">
                <div className="text-xs text-gray-400 px-2 py-1">Qrup / Gün</div>
                {DAY_ORDER.map((d) => (
                  <div key={d} className="text-[11px] font-semibold text-gray-500 text-center py-1">
                    {DAY_LABELS[d]}
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                {rows.map((row) => (
                  <div key={row.groupId} className="grid grid-cols-[220px_repeat(7,minmax(64px,1fr))] gap-1.5">
                    <div className="text-sm text-gray-700 px-2 py-2 rounded-lg bg-gray-50 border border-white-border truncate">
                      {row.groupName}
                    </div>
                    {row.cells.map((cell) => (
                      <div
                        key={`${row.groupId}-${cell.weekday}`}
                        className={cn(
                          'rounded-lg border px-1 py-2 text-center transition-all hover:scale-[1.02]',
                          cellTone(cell.issueRate)
                        )}
                        title={`Risk səviyyəsi: ${Math.round(cell.issueRate)}% | Gecikmə: ${Math.round(cell.lateRate)}% | Gəlməmə: ${Math.round(cell.absentRate)}%`}
                      >
                        <div className="text-xs font-bold">{Math.round(cell.issueRate)}%</div>
                        <div className="text-[10px] opacity-80">Gec {Math.round(cell.lateRate)} / Gəlm {Math.round(cell.absentRate)}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
            <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-2">
              <AlertTriangle size={14} />
              Bu ay riskli gün markerləri
            </div>
            {riskyWeekdays.length === 0 ? (
              <p className="text-xs text-gray-500">Risk pikləri görünmür, həftəlik ritm stabildir.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {riskyWeekdays.map((w) => (
                  <span key={w.weekday} className="inline-flex items-center rounded-full border border-amber-200 bg-white px-2 py-1 text-xs text-amber-700">
                    {DAY_LABELS[w.weekday]}: {Math.round(w.issueRate)}%
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <div className="flex items-center gap-2 text-accent-blue text-sm font-medium mb-2">
              <TrendingUp size={14} />
              Davranış analizi
            </div>
            <div className="space-y-1.5">
              {insights.map((item) => (
                <p key={item} className="text-xs text-gray-700">• {item}</p>
              ))}
              {insights.length === 0 && (
                <p className="text-xs text-gray-500">Bu period üçün nümunə çıxarmaq üçün yetərli məlumat yoxdur.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
