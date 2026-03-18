'use client';

import { useMemo } from 'react';
import { format, addDays } from 'date-fns';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
  ReferenceArea,
} from 'recharts';
import { AlertTriangle, TrendingUp, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/format';
import type { DebtorInfo, MonthlyPaymentReport } from '@/types';

type ForecastPoint = {
  date: string;
  label: string;
  projected: number;
  risk: boolean;
  riskReason?: string;
};

function roundAmount(value: number): number {
  return Math.max(0, Math.round(value));
}

function dayWeight(day: number): number {
  // 0=Sun ... 6=Sat
  if (day === 0) return 0.2;
  if (day === 6) return 0.45;
  if (day === 1) return 1.15;
  if (day === 2) return 1.1;
  if (day === 5) return 1.2;
  return 1;
}

function buildForecast(debtors: DebtorInfo[], report: MonthlyPaymentReport | null): ForecastPoint[] {
  const today = new Date();
  const totalDebtExposure = debtors.reduce((sum, d) => sum + d.totalDebt, 0);
  const remainingThisMonth = Math.max(0, (report?.totalExpected ?? 0) - (report?.totalCollected ?? 0));

  const recoverableDebt30 = totalDebtExposure * 0.34;
  const plannedPool = remainingThisMonth * 0.88 + recoverableDebt30;
  const baseDaily = plannedPool > 0 ? plannedPool / 30 : Math.max(40, totalDebtExposure * 0.02);

  const days = Array.from({ length: 30 }, (_, idx) => addDays(today, idx + 1));
  const weighted = days.map((d) => {
    const w = dayWeight(d.getDay());
    const monthStartLift = d.getDate() <= 7 ? 0.18 : 0;
    const paydayLift = d.getDate() >= 20 && d.getDate() <= 28 ? 0.14 : 0;
    return {
      date: format(d, 'yyyy-MM-dd'),
      label: format(d, 'dd MMM'),
      factor: w + monthStartLift + paydayLift,
      dow: d.getDay(),
    };
  });

  const totalFactor = weighted.reduce((sum, x) => sum + x.factor, 0) || 1;

  return weighted.map((d) => {
    const projected = roundAmount((plannedPool * d.factor) / totalFactor);
    const weekdayLow = d.dow !== 0 && d.dow !== 6 && projected < baseDaily * 0.62;
    const heavyDebtLow = totalDebtExposure > 0 && projected < (totalDebtExposure / Math.max(1, debtors.length)) * 0.32;

    let riskReason: string | undefined;
    if (weekdayLow) riskReason = 'İş günü üçün proqnoz zəifdir';
    else if (heavyDebtLow) riskReason = 'Borcluların həcminə görə aşağı daxilolma';

    return {
      date: d.date,
      label: d.label,
      projected,
      risk: Boolean(riskReason),
      riskReason,
    };
  });
}

interface SmartPaymentForecastProps {
  debtors: DebtorInfo[];
  currentMonthReport: MonthlyPaymentReport | null;
}

export function SmartPaymentForecast({ debtors, currentMonthReport }: SmartPaymentForecastProps) {
  const forecast = useMemo(() => buildForecast(debtors, currentMonthReport), [debtors, currentMonthReport]);

  const total30 = forecast.reduce((sum, p) => sum + p.projected, 0);
  const riskyDays = forecast.filter((p) => p.risk);
  const topRiskDay = [...riskyDays].sort((a, b) => a.projected - b.projected)[0];

  const maxValue = Math.max(1, ...forecast.map((p) => p.projected));
  const riskThreshold = Math.round(maxValue * 0.28);

  return (
    <Card className="overflow-hidden" padding="md">
      <CardHeader className="mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <CalendarClock size={16} />
          </div>
          <div>
            <CardTitle>Smart Payment Forecast</CardTitle>
            <p className="text-xs text-gray-500">Gələn 30 gün üçün daxilolma proqnozu</p>
          </div>
        </div>
        <Badge variant="blue" size="sm">AI-Like Forecast</Badge>
      </CardHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-white-border bg-green-50/70 p-3">
          <p className="text-[11px] text-gray-500">30 gün cəmi proqnoz</p>
          <p className="text-sm font-semibold text-green-700 mt-1">{formatCurrency(total30)}</p>
        </div>
        <div className="rounded-xl border border-white-border bg-rose-50/70 p-3">
          <p className="text-[11px] text-gray-500">Riskli kassa günləri</p>
          <p className="text-sm font-semibold text-accent-rose mt-1">{riskyDays.length} gün</p>
        </div>
        <div className="rounded-xl border border-white-border bg-blue-50/70 p-3">
          <p className="text-[11px] text-gray-500">Ən riskli gün</p>
          <p className="text-sm font-semibold text-accent-blue mt-1">{topRiskDay ? topRiskDay.label : '-'}</p>
        </div>
      </div>

      <div className="h-[290px] rounded-xl border border-white-border bg-white px-2 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={forecast} margin={{ top: 14, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(v)}₼`}
            />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #E4EDE8',
                borderRadius: '10px',
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number | string | undefined, name: string | number | undefined, payload: unknown) => {
                if (name === 'projected') {
                  const reason = (payload as { payload?: { riskReason?: string } } | undefined)?.payload?.riskReason;
                  return [
                    `${formatCurrency(Number(value ?? 0))}${reason ? ` • ${reason}` : ''}`,
                    'Proqnoz daxilolma',
                  ];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `Tarix: ${label}`}
            />

            <ReferenceArea y1={0} y2={riskThreshold} fill="#FEE2E2" fillOpacity={0.35} />

            <Bar dataKey="projected" fill="#4A90D9" radius={[6, 6, 0, 0]} barSize={10} />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#1A8B52"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: ForecastPoint };
                if (!cx || !cy || !payload) return null;
                if (!payload.risk) return <circle cx={cx} cy={cy} r={2.2} fill="#1A8B52" />;
                return <circle cx={cx} cy={cy} r={4.2} fill="#F56565" stroke="#fff" strokeWidth={1.5} />;
              }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/50 p-3">
        <div className="flex items-center gap-2 text-rose-700 text-sm font-medium mb-2">
          <AlertTriangle size={14} />
          Bu ay riskli kassa günləri
        </div>
        {riskyDays.length === 0 ? (
          <p className="text-xs text-gray-500">Hazırkı hesablamaya görə ciddi riskli gün görünmür.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {riskyDays.slice(0, 8).map((d) => (
              <span key={d.date} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2 py-1 text-xs text-rose-700">
                <TrendingUp size={11} className="rotate-180" />
                {d.label}
              </span>
            ))}
            {riskyDays.length > 8 && (
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500">
                +{riskyDays.length - 8} gün
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
