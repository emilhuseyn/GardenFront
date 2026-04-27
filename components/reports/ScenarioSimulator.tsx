'use client';

import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, SlidersHorizontal, TrendingUp, Users2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { childrenApi } from '@/lib/api/children';
import { formatCurrency } from '@/lib/utils/format';
import type { Child, Group } from '@/types';

interface ScenarioSimulatorProps {
  groups: Group[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percent(value: number): number {
  return Math.round(value * 100);
}

export function ScenarioSimulator({ groups }: ScenarioSimulatorProps) {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);

  const [feeFrom, setFeeFrom] = useState(300);
  const [feeTo, setFeeTo] = useState(320);

  const [groupId, setGroupId] = useState<string>('');
  const [targetMax, setTargetMax] = useState<number>(18);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await childrenApi.getAll({ status: 'Active', pageSize: 0 }, { silentError: true });
        if (!cancelled) {
          setChildren(res.items);

          const fees = res.items.map((c) => c.monthlyFee).filter((n) => Number.isFinite(n));
          const closestTo300 = fees.length > 0
            ? fees.reduce((best, n) => (Math.abs(n - 300) < Math.abs(best - 300) ? n : best), fees[0])
            : 300;
          const from = Math.round(closestTo300 / 5) * 5;
          setFeeFrom(from);
          setFeeTo(from + 20);
        }
      } catch {
        if (!cancelled) setChildren([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (groups.length === 0) return;
    if (!groupId) {
      const first = groups[0];
      setGroupId(String(first.id));
      setTargetMax(Math.max(first.maxChildCount + 3, 18));
      return;
    }

    const selected = groups.find((g) => String(g.id) === groupId);
    if (!selected) return;
    const minT = selected.maxChildCount;
    const maxT = selected.maxChildCount + 12;
    setTargetMax((prev) => clamp(prev, minT, maxT));
  }, [groups, groupId]);

  const feeSim = useMemo(() => {
    const totalCurrent = children.reduce((sum, c) => sum + c.monthlyFee, 0);

    // Impact only children whose current fee is close to the selected baseline (e.g. 300).
    const affected = children.filter((c) => Math.abs(c.monthlyFee - feeFrom) <= 10);
    const deltaPerChild = feeTo - feeFrom;
    const deltaMonthly = affected.length * deltaPerChild;
    const projected = totalCurrent + deltaMonthly;

    return {
      totalCurrent,
      affectedCount: affected.length,
      deltaMonthly,
      deltaYearly: deltaMonthly * 12,
      projected,
      growthPct: totalCurrent > 0 ? (deltaMonthly / totalCurrent) * 100 : 0,
    };
  }, [children, feeFrom, feeTo]);

  const selectedGroup = useMemo(
    () => groups.find((g) => String(g.id) === groupId) ?? null,
    [groups, groupId]
  );

  const capacitySim = useMemo(() => {
    if (!selectedGroup) return null;

    const currentMax = selectedGroup.maxChildCount;
    const currentCount = selectedGroup.currentChildCount;
    const nextMax = clamp(targetMax, currentMax, currentMax + 12);

    const currentOcc = currentMax > 0 ? currentCount / currentMax : 0;
    const nextOcc = nextMax > 0 ? currentCount / nextMax : 0;

    const extraSeats = nextMax - currentMax;
    const toReach90 = Math.max(0, Math.ceil(nextMax * 0.9 - currentCount));

    return {
      currentMax,
      nextMax,
      currentCount,
      currentOcc,
      nextOcc,
      extraSeats,
      toReach90,
    };
  }, [selectedGroup, targetMax]);

  return (
    <Card padding="md" className="overflow-hidden">
      <CardHeader className="mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BrainCircuit size={16} />
          </div>
          <div>
            <CardTitle>Ssenari Simulyatoru</CardTitle>
            <p className="text-xs text-gray-500">Nə olsa nə olar? Menecment üçün qərar simulyatoru</p>
          </div>
        </div>
        <Badge variant="violet" size="sm">Nə Olsa Mühərriki</Badge>
      </CardHeader>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white-border p-4 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_45%)]">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-green-600" />
              <h4 className="text-sm font-semibold text-gray-800">Ödəniş Ssenarisi</h4>
            </div>

            <p className="text-xs text-gray-500 mb-2">Aylıq ödənişi dəyişsək gəlir necə təsirlənər?</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="text-xs text-gray-600">
                Cari baza (₼)
                <input
                  type="number"
                  value={feeFrom}
                  onChange={(e) => {
                    const v = Number(e.target.value || 0);
                    setFeeFrom(v);
                    if (feeTo < v) setFeeTo(v);
                  }}
                  className="mt-1 w-full border border-white-border rounded-lg px-2.5 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Yeni baza (₼)
                <input
                  type="number"
                  value={feeTo}
                  onChange={(e) => setFeeTo(Number(e.target.value || 0))}
                  className="mt-1 w-full border border-white-border rounded-lg px-2.5 py-1.5 text-sm"
                />
              </label>
            </div>

            <div className="rounded-xl border border-green-100 bg-green-50/60 p-3 space-y-1.5">
              <p className="text-xs text-gray-600">Təsir dairəsi: {feeSim.affectedCount} uşaq</p>
              <p className="text-sm font-semibold text-green-700">Aylıq fərq: {formatCurrency(feeSim.deltaMonthly)}</p>
              <p className="text-xs text-gray-600">İllik fərq: {formatCurrency(feeSim.deltaYearly)}</p>
              <p className="text-xs text-gray-600">Gəlir artımı: {feeSim.growthPct.toFixed(1)}%</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-gray-50 border border-white-border p-2.5">
                <p className="text-[11px] text-gray-500">Cari proqnoz</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatCurrency(feeSim.totalCurrent)}</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                <p className="text-[11px] text-gray-500">Ssenari sonrası</p>
                <p className="text-sm font-semibold text-accent-blue mt-0.5">{formatCurrency(feeSim.projected)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white-border p-4 bg-[radial-gradient(circle_at_top_right,rgba(74,144,217,0.14),transparent_45%)]">
            <div className="flex items-center gap-2 mb-3">
              <Users2 size={14} className="text-accent-blue" />
              <h4 className="text-sm font-semibold text-gray-800">Qrup Doluluq Ssenarisi</h4>
            </div>

            <div className="mb-3">
              <Select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
              />
            </div>

            {capacitySim ? (
              <>
                <p className="text-xs text-gray-500 mb-2">
                  Max sayı {capacitySim.currentMax}-dən {capacitySim.nextMax}-ə qaldırsaq doluluq necə dəyişər?
                </p>

                <div className="mb-3">
                  <input
                    type="range"
                    min={capacitySim.currentMax}
                    max={capacitySim.currentMax + 12}
                    value={capacitySim.nextMax}
                    onChange={(e) => setTargetMax(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                    <span>{capacitySim.currentMax}</span>
                    <span className="font-semibold text-gray-700">Hədəf: {capacitySim.nextMax}</span>
                    <span>{capacitySim.currentMax + 12}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">Cari doluluq</span>
                      <span className="font-semibold text-gray-700">{percent(capacitySim.currentOcc)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-accent-amber" style={{ width: `${Math.min(100, percent(capacitySim.currentOcc))}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">Ssenari doluluğu</span>
                      <span className="font-semibold text-accent-blue">{percent(capacitySim.nextOcc)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-accent-blue" style={{ width: `${Math.min(100, percent(capacitySim.nextOcc))}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Yeni yer sayı</p>
                    <p className="text-sm font-semibold text-accent-blue">+{capacitySim.extraSeats} yer</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">90% doluluq üçün</p>
                    <p className="text-sm font-semibold text-gray-800">+{capacitySim.toReach90} uşaq</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white-border p-4 text-sm text-gray-500">
                Qrup seçimi üçün məlumat yoxdur.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
        <div className="flex items-center gap-2 text-indigo-700 text-sm font-medium mb-1.5">
          <SlidersHorizontal size={14} />
          Menecment üçün qısa analiz
        </div>
        <p className="text-xs text-gray-700">
          Ödəniş ssenarisində ən çox eyni tarifdə olan uşaqlar təsirlənir; qrup ssenarisində isə max artırımı qısa müddətdə doluluq faizini düşürür, lakin qəbul planlaması üçün əlavə elastiklik yaradır.
        </p>
      </div>
    </Card>
  );
}
