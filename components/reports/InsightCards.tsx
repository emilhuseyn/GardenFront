'use client';

import { useEffect, useMemo, useState } from 'react';
import { Brain, TrendingDown, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { childrenApi } from '@/lib/api/children';
import { attendanceApi } from '@/lib/api/attendance';
import { paymentsApi } from '@/lib/api/payments';
import { formatCurrency } from '@/lib/utils/format';
import type { AttendanceEntry } from '@/types';

type InsightTone = 'neutral' | 'warning' | 'positive';

interface InsightItem {
  id: string;
  text: string;
  tone: InsightTone;
  details?: string[];
  sparkline?: number[];
  sparklineLabel?: string;
}

function MiniSparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) return null;

  const width = 160;
  const height = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 8) + 4;
      const y = height - (((v - min) / range) * (height - 10) + 5);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        fill="none"
        stroke="#4A90D9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * (width - 8) + 4;
        const y = height - (((v - min) / range) * (height - 10) + 5);
        return <circle key={`${i}-${v}`} cx={x} cy={y} r="2" fill="#1A8B52" />;
      })}
    </svg>
  );
}

function calcRate(entries: AttendanceEntry[]): number | null {
  if (entries.length === 0) return null;
  const present = entries.filter((e) => e.status === 1).length;
  return present / entries.length;
}

export function InsightCards() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [openInsightId, setOpenInsightId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      try {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        const recentFrom = format(subDays(today, 13), 'yyyy-MM-dd');
        const prevFrom = format(subDays(today, 27), 'yyyy-MM-dd');
        const prevTo = format(subDays(today, 14), 'yyyy-MM-dd');

        const [childrenRes, debtorsRes] = await Promise.allSettled([
          childrenApi.getAll({ status: 'Active', pageSize: 220 }, { silentError: true }),
          paymentsApi.getDebtors({ silentError: true }),
        ]);

        const children = childrenRes.status === 'fulfilled' ? childrenRes.value.items : [];
        const debtors = debtorsRes.status === 'fulfilled' ? debtorsRes.value : [];

        const halfDayChildren = children.filter((c) => c.scheduleType === 'HalfDay').slice(0, 60);

        const halfDayAttendance = await Promise.all(
          halfDayChildren.map(async (child) => {
            try {
              const history = await attendanceApi.getChildHistory(child.id, prevFrom, todayStr, { silentError: true });
              return { childId: child.id, history };
            } catch {
              return { childId: child.id, history: [] as AttendanceEntry[] };
            }
          })
        );

        const recentBucket: AttendanceEntry[] = [];
        const prevBucket: AttendanceEntry[] = [];

        for (const row of halfDayAttendance) {
          const recent = row.history.filter((e) => e.date >= recentFrom && e.date <= todayStr);
          const prev = row.history.filter((e) => e.date >= prevFrom && e.date <= prevTo);
          recentBucket.push(...recent);
          prevBucket.push(...prev);
        }

        const recentRate = calcRate(recentBucket);
        const prevRate = calcRate(prevBucket);

        const cards: InsightItem[] = [];

        if (recentRate !== null && prevRate !== null && prevBucket.length >= 20 && recentBucket.length >= 20) {
          const diffPct = Math.round((recentRate - prevRate) * 100);
          const baseDetails = [
            `Əvvəlki 14 gün iştirak: ${Math.round(prevRate * 100)}%`,
            `Son 14 gün iştirak: ${Math.round(recentRate * 100)}%`,
            `Nümunə ölçüsü: ${halfDayChildren.length} yarımgünlük uşaq`,
          ];
          if (diffPct <= -4) {
            cards.push({
              id: 'halfday-drop',
              text: `Son 2 həftədə yarımgünlük uşaqlarda davamiyyət ${Math.abs(diffPct)}% azalıb.`,
              tone: 'warning',
              details: baseDetails,
              sparkline: [Math.round(prevRate * 100), Math.round(recentRate * 100)],
              sparklineLabel: '14 günlük müqayisə trendi',
            });
          } else if (diffPct >= 4) {
            cards.push({
              id: 'halfday-rise',
              text: `Son 2 həftədə yarımgünlük uşaqlarda davamiyyət ${diffPct}% artıb.`,
              tone: 'positive',
              details: baseDetails,
              sparkline: [Math.round(prevRate * 100), Math.round(recentRate * 100)],
              sparklineLabel: '14 günlük müqayisə trendi',
            });
          } else {
            cards.push({
              id: 'halfday-stable',
              text: 'Son 2 həftədə yarımgünlük uşaqlarda davamiyyət sabit qalıb.',
              tone: 'neutral',
              details: baseDetails,
              sparkline: [Math.round(prevRate * 100), Math.round(recentRate * 100)],
              sparklineLabel: '14 günlük müqayisə trendi',
            });
          }
        }

        const delayTrend = [...debtors]
          .filter((d) => d.unpaidMonths.length >= 2)
          .sort((a, b) => {
            if (b.unpaidMonths.length !== a.unpaidMonths.length) {
              return b.unpaidMonths.length - a.unpaidMonths.length;
            }
            return b.totalDebt - a.totalDebt;
          });

        if (delayTrend.length >= 3) {
          const severitySpark = [
            delayTrend.filter((d) => d.unpaidMonths.length >= 2).length,
            delayTrend.filter((d) => d.unpaidMonths.length >= 3).length,
            delayTrend.filter((d) => d.unpaidMonths.length >= 4).length,
          ];
          cards.push({
            id: 'payment-delay-3',
            text: '3 valideynin ödəniş davranışı gecikmə trendinə düşüb.',
            tone: 'warning',
            details: [
              `2+ gecikmiş ayı olan profil sayı: ${delayTrend.length}`,
              `Ən riskli profillər: ${delayTrend.slice(0, 3).map((d) => d.childFullName).join(', ')}`,
              `Maksimum gecikən ay sayı: ${Math.max(...delayTrend.map((d) => d.unpaidMonths.length))}`,
            ],
            sparkline: severitySpark,
            sparklineLabel: 'Gecikmə dərinliyi (2+, 3+, 4+ ay)',
          });
        } else if (delayTrend.length > 0) {
          const severitySpark = [
            delayTrend.filter((d) => d.unpaidMonths.length >= 2).length,
            delayTrend.filter((d) => d.unpaidMonths.length >= 3).length,
            delayTrend.filter((d) => d.unpaidMonths.length >= 4).length,
          ];
          cards.push({
            id: 'payment-delay-some',
            text: `${delayTrend.length} valideyndə ödəniş gecikməsi trendi müşahidə olunur.`,
            tone: 'warning',
            details: [
              `2+ gecikmiş ayı olan profil sayı: ${delayTrend.length}`,
              `Ən riskli profil: ${delayTrend[0].childFullName}`,
              `Ən yüksək borc: ${formatCurrency(delayTrend[0].totalDebt)}`,
            ],
            sparkline: severitySpark,
            sparklineLabel: 'Gecikmə dərinliyi (2+, 3+, 4+ ay)',
          });
        } else {
          cards.push({
            id: 'payment-stable',
            text: 'Ödəniş davranışı ümumi olaraq stabil görünür, gecikmə trendi aşağıdır.',
            tone: 'positive',
            details: ['2+ gecikmiş ayı olan profil tapılmadı.', 'Cari dövrdə kəskin gecikmə siqnalı görünmür.'],
            sparkline: [0, 0, 0],
            sparklineLabel: 'Gecikmə dərinliyi (2+, 3+, 4+ ay)',
          });
        }

        const totalDebt = debtors.reduce((sum, d) => sum + d.totalDebt, 0);
        if (debtors.length > 0) {
          const avgDebt = totalDebt / debtors.length;
          const topDebtor = [...debtors].sort((a, b) => b.totalDebt - a.totalDebt)[0];
          cards.push({
            id: 'debt-summary',
            text: `Hazırda ${debtors.length} borclu profil üzrə ümumi risk məbləği ${formatCurrency(totalDebt)} təşkil edir.`,
            tone: totalDebt >= 2500 ? 'warning' : 'neutral',
            details: [
              `Orta borc: ${formatCurrency(avgDebt)}`,
              `Ən böyük risk profili: ${topDebtor.childFullName} (${formatCurrency(topDebtor.totalDebt)})`,
            ],
            sparkline: [...debtors]
              .sort((a, b) => b.totalDebt - a.totalDebt)
              .slice(0, 5)
              .map((d) => Math.round(d.totalDebt)),
            sparklineLabel: 'Top 5 borc profili (AZN)',
          });
        }

        const fallback: InsightItem = {
          id: 'fallback',
          text: 'Bu gün üçün kritik dəyişiklik görünmür. Göstəricilər nəzarət zonasındadır.',
          tone: 'neutral',
          details: ['Kritik sərhəd aşımı qeydə alınmadı.', 'Mövcud trend monitorinq zonasında qalır.'],
          sparkline: [1, 1, 1],
          sparklineLabel: 'Trend stabildir',
        };

        if (!cancelled) {
          setInsights(cards.length > 0 ? cards.slice(0, 3) : [fallback]);
        }
      } catch {
        if (!cancelled) {
          setInsights([
            {
              id: 'error-safe',
              text: 'Insight kartları üçün məlumat qismən yükləndi. Bir az sonra yenidən cəhd edin.',
              tone: 'neutral',
              details: ['Bəzi endpoint-lərdən cavab gecikdi və ya alınmadı.', 'Sistem qismən dataya əsasən təhlükəsiz nəticə göstərir.'],
              sparkline: [0, 1, 0],
              sparklineLabel: 'Qismən data siqnalı',
            },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const badge = useMemo(() => {
    if (insights.some((i) => i.tone === 'warning')) return { label: 'Diqqət', variant: 'amber' as const };
    if (insights.some((i) => i.tone === 'positive')) return { label: 'Stabil', variant: 'green' as const };
    return { label: 'Normal', variant: 'blue' as const };
  }, [insights]);

  const toneStyle: Record<InsightTone, string> = {
    warning: 'border-amber-200 bg-amber-50/60',
    positive: 'border-green-200 bg-green-50/60',
    neutral: 'border-blue-100 bg-blue-50/50',
  };

  return (
    <Card padding="md" className="overflow-hidden">
      <CardHeader className="mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-accent-blue flex items-center justify-center">
            <Brain size={16} />
          </div>
          <div>
            <CardTitle>İnsayt Kartları</CardTitle>
            <p className="text-xs text-gray-500">AI tərzli qısa şərhlər</p>
          </div>
        </div>
        <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
      </CardHeader>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {insights.map((item) => (
            <div key={item.id} className={`rounded-xl border p-3 ${toneStyle[item.tone]}`}>
              <div className="flex items-center gap-1.5 mb-2">
                {item.tone === 'warning' ? (
                  <AlertCircle size={13} className="text-amber-600" />
                ) : item.tone === 'positive' ? (
                  <CheckCircle2 size={13} className="text-green-600" />
                ) : (
                  <TrendingDown size={13} className="text-accent-blue rotate-180" />
                )}
                <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                  {item.tone === 'warning' ? 'Risk İnsaytı' : item.tone === 'positive' ? 'Müsbət İnsayt' : 'Trend İnsaytı'}
                </span>
              </div>
              <p className="text-sm leading-5 text-gray-700">{item.text}</p>

              {item.details && item.details.length > 0 && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenInsightId((prev) => (prev === item.id ? null : item.id))}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Niyə belə oldu?
                    <ChevronDown
                      size={13}
                      className={`transition-transform ${openInsightId === item.id ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {openInsightId === item.id && (
                    <div className="mt-2 rounded-lg border border-white-border/80 bg-white/70 p-2.5 space-y-1.5">
                      {item.sparkline && item.sparkline.length > 1 && (
                        <div className="mb-1.5">
                          <p className="text-[11px] text-gray-500 mb-1">{item.sparklineLabel || 'Mini trend'}</p>
                          <MiniSparkline values={item.sparkline} />
                        </div>
                      )}
                      {item.details.map((detail) => (
                        <p key={detail} className="text-xs text-gray-600">- {detail}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
