'use client';
import { useState, useEffect } from 'react';
import { Save, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { TimeInput } from '@/components/attendance/TimeInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/constants';
import { schedulesApi } from '@/lib/api/schedules';
import { useAuth } from '@/lib/hooks/useAuth';
import type { ScheduleConfig } from '@/types';

const SCHEDULE_META: Record<string, { name: string; color: string; icon: string }> = {
  FullDay: {
    name: 'Tam Günlük',
    color: 'border-green-400 bg-green-50',
    icon: '☀️',
  },
  HalfDay: {
    name: 'Yarım Günlük',
    color: 'border-accent-amber bg-amber-50',
    icon: '🌤️',
  },
};

export default function SchedulePage() {
  const { permissions } = useAuth();
  const [configs, setConfigs] = useState<ScheduleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [times, setTimes] = useState<Record<number, { startTime: string; endTime: string }>>({});

  useEffect(() => {
    schedulesApi.getAll()
      .then((data) => {
        setConfigs(data);
        const initial: Record<number, { startTime: string; endTime: string }> = {};
        data.forEach((c) => { initial[c.id] = { startTime: c.startTime, endTime: c.endTime }; });
        setTimes(initial);
      })
      .catch(() => toast.error('Qrafik yüklənmədi'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (config: ScheduleConfig) => {
    const t = times[config.id];
    if (!t) return;
    setSaving(config.id);
    try {
      await schedulesApi.update(config.id, t);
      toast.success('Qrafik yadda saxlanıldı');
    } catch {
      toast.error('Xəta baş verdi');
    } finally {
      setSaving(null);
    }
  };

  if (!permissions.schedule.view) {
    return null;
  }

  const canEdit = permissions.schedule.edit;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qrafik"
        description="Gündəlik iş qrafikinin parametrləri"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1e2130] border-2 dark:border-gray-700/60 rounded-2xl p-5">
              <Skeleton className="h-6 w-36 mb-4" />
              <Skeleton className="h-12 rounded-xl mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))
        ) : (
          configs.map((config) => {
            const meta = SCHEDULE_META[config.scheduleType] ?? SCHEDULE_META['FullDay'];
            const t = times[config.id] ?? { startTime: config.startTime, endTime: config.endTime };
            return (
              <div key={config.id} className={cn('bg-white dark:bg-[#1e2130] border-2 rounded-2xl p-5', meta.color)}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{meta.icon}</span>
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 font-display">{meta.name}</h3>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      loading={saving === config.id}
                      onClick={() => handleSave(config)}
                    >
                      <Save size={13} /> Saxla
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-5 p-3 bg-white/70 dark:bg-gray-700/40 rounded-xl">
                  <Clock size={15} className="text-gray-400 dark:text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Başlama:</span>
                  <TimeInput
                    value={t.startTime}
                    onChange={(v) => canEdit && setTimes((prev) => ({ ...prev, [config.id]: { ...prev[config.id], startTime: v } }))}
                    disabled={!canEdit}
                  />
                  <span className="text-xs text-gray-400 dark:text-gray-500">–</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Bitmə:</span>
                  <TimeInput
                    value={t.endTime}
                    onChange={(v) => canEdit && setTimes((prev) => ({ ...prev, [config.id]: { ...prev[config.id], endTime: v } }))}
                    disabled={!canEdit}
                  />
                </div>


              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
