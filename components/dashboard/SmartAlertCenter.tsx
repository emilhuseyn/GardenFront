'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, TrendingDown, Clock3, Wallet } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { childrenApi } from '@/lib/api/children';
import { paymentsApi } from '@/lib/api/payments';
import { attendanceApi } from '@/lib/api/attendance';
import type { AttendanceEntry, DebtorInfo } from '@/types';

type RiskLevel = 'high' | 'medium' | 'low';

interface ChildRisk {
  childId: number;
  fullName: string;
  groupName: string;
  score: number;
  level: RiskLevel;
  reasons: string[];
}

function toPercent(p: number): number {
  return Math.round(Math.max(0, Math.min(100, p * 100)));
}

function calcRate(entries: AttendanceEntry[]): number | null {
  if (entries.length === 0) return null;
  const present = entries.filter((e) => e.status === 1).length;
  return present / entries.length;
}

function scoreLevel(score: number): RiskLevel {
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export function SmartAlertCenter() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<ChildRisk[]>([]);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const run = async () => {
      setLoading(true);
      setError(false);
      try {
        // Set timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('SmartAlertCenter timeout'));
          }, 10000); // 10 second timeout
        });

        const mainPromise = (async () => {
          const [childrenRes, debtorsRes] = await Promise.allSettled([
            childrenApi.getAll({ status: 'Active', pageSize: 120 }, { silentError: true }),
            paymentsApi.getDebtors({ silentError: true }),
          ]);

          const children = childrenRes.status === 'fulfilled' ? childrenRes.value.items : [];
          const debtors = debtorsRes.status === 'fulfilled' ? debtorsRes.value : [];

          const debtorByChildId = new Map<number, DebtorInfo>(
            debtors.map((d) => [d.childId, d])
          );

          // Prioritize children with debt, then fill remaining list (reduced to 30 for performance)
          const prioritized = [...children].sort((a, b) => {
            const aDebt = debtorByChildId.has(a.id) ? 1 : 0;
            const bDebt = debtorByChildId.has(b.id) ? 1 : 0;
            if (aDebt !== bDebt) return bDebt - aDebt;
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'az');
          });

          const sampleChildren = prioritized.slice(0, 30);

        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        const recentFromStr = format(subDays(today, 13), 'yyyy-MM-dd'); // last 14 days inclusive
        const prevFromStr = format(subDays(today, 27), 'yyyy-MM-dd');
        const prevToStr = format(subDays(today, 14), 'yyyy-MM-dd');

        // Pull 28-day attendance history per child for trend and lateness analysis
        const attendanceResults = await Promise.all(
          sampleChildren.map(async (child) => {
            try {
                const history = await attendanceApi.getChildHistory(child.id, prevFromStr, todayStr, { silentError: true });
              return { childId: child.id, history };
            } catch {
              return { childId: child.id, history: [] as AttendanceEntry[] };
            }
          })
        );

        const attendanceByChild = new Map<number, AttendanceEntry[]>(
          attendanceResults.map((r) => [r.childId, r.history])
        );

        const computed: ChildRisk[] = sampleChildren.map((child) => {
          const fullName = `${child.firstName} ${child.lastName}`;
          const reasons: string[] = [];
          let score = 0;

          const debtor = debtorByChildId.get(child.id);
          if (debtor) {
            const overdueMonths = debtor.unpaidMonths.length;
            const paymentScore = Math.min(50, overdueMonths * 12 + Math.min(18, Math.floor(debtor.totalDebt / 150) * 4));
            score += paymentScore;
            reasons.push(`Ödəniş gecikməsi: ${overdueMonths} ay, borc məbləği`);
          }

          const history = attendanceByChild.get(child.id) ?? [];
          const recentWindow = history.filter((e) => e.date >= recentFromStr && e.date <= todayStr);
          const prevWindow = history.filter((e) => e.date >= prevFromStr && e.date <= prevToStr);

          const recentRate = calcRate(recentWindow);
          const prevRate = calcRate(prevWindow);

          if (recentRate !== null && prevRate !== null) {
            const drop = prevRate - recentRate;
            if (drop >= 0.25) {
              score += 25;
              reasons.push(`Davamiyyət düşüşü: -${toPercent(drop)}% (14 gün)`);
            } else if (drop >= 0.15) {
              score += 16;
              reasons.push(`Davamiyyət düşüşü: -${toPercent(drop)}% (14 gün)`);
            } else if (drop >= 0.08) {
              score += 10;
              reasons.push(`Davamiyyət düşüşü: -${toPercent(drop)}% (14 gün)`);
            }
          }

          const lateCount = recentWindow.filter((e) => !!e.isLate).length;
          if (lateCount >= 4) {
            score += 20;
            reasons.push(`Tez-tez gecikmə: ${lateCount} dəfə (14 gün)`);
          } else if (lateCount >= 2) {
            score += 12;
            reasons.push(`Tez-tez gecikmə: ${lateCount} dəfə (14 gün)`);
          } else if (lateCount === 1) {
            score += 6;
            reasons.push('Son 14 gündə gecikmə qeydə alınıb');
          }

          score = Math.min(100, Math.round(score));

          return {
            childId: child.id,
            fullName,
            groupName: child.groupName,
            score,
            level: scoreLevel(score),
            reasons,
          };
        });

          const risky = computed
            .filter((x) => x.score >= 35)
            .sort((a, b) => b.score - a.score);

          if (!cancelled) setAlerts(risky);
        })();

        await Promise.race([mainPromise, timeoutPromise]);
      } catch {
        if (!cancelled) {
          setError(true);
          setAlerts([]);
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const topAlerts = useMemo(() => alerts.slice(0, 7), [alerts]);

  // Silently handle errors - don't show error UI, just return null
  if (error) {
    return null;
  }

  return (
    <Card padding="md" className="mb-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
          <div>
            <CardTitle>Smart Alert Center</CardTitle>
            <p className="text-xs text-gray-500">
              Bu həftə diqqət tələb edən {topAlerts.length} uşaq
            </p>
          </div>
        </div>
      </CardHeader>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white-border dark:border-gray-700/60 p-3">
              <Skeleton className="h-4 w-44 mb-2" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : topAlerts.length === 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Bu həftə kritik risk görünmür. Nəzarət göstəriciləri stabil görünür.
        </div>
      ) : (
        <div className="space-y-2">
          {topAlerts.map((item) => (
            <Link
              key={item.childId}
              href={`/children/${item.childId}`}
              className="block rounded-xl border border-white-border dark:border-gray-700/60 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Avatar name={item.fullName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {item.fullName}
                    </p>
                    <Badge
                      size="xs"
                      variant={item.level === 'high' ? 'rose' : item.level === 'medium' ? 'amber' : 'blue'}
                    >
                      Risk: {item.score}
                    </Badge>
                    <Badge size="xs" variant="gray">{item.groupName}</Badge>
                  </div>

                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                    {item.reasons.slice(0, 2).map((reason) => {
                      const icon = reason.startsWith('Ödəniş')
                        ? <Wallet size={11} />
                        : reason.startsWith('Davamiyyət')
                          ? <TrendingDown size={11} />
                          : <Clock3 size={11} />;
                      return (
                        <span key={reason} className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 text-gray-600 dark:text-gray-300">
                          {icon}
                          {reason}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
