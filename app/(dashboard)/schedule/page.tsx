'use client';
import { useState, useEffect } from 'react';
import { Save, Clock, Plus, Trash2, Power, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TimeInput } from '@/components/attendance/TimeInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/constants';
import { schedulesApi } from '@/lib/api/schedules';
import { useAuth } from '@/lib/hooks/useAuth';
import type { ScheduleConfig } from '@/types';

const BUILTIN_META: Record<string, { color: string; icon: string }> = {
  FullDay: { color: 'border-green-400 bg-green-50',  icon: '☀️' },
  HalfDay: { color: 'border-accent-amber bg-amber-50', icon: '🌤️' },
};

function metaFor(code: string) {
  return BUILTIN_META[code] ?? { color: 'border-blue-300 bg-blue-50', icon: '🕒' };
}

export default function SchedulePage() {
  const { permissions } = useAuth();
  const [configs, setConfigs] = useState<ScheduleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [times, setTimes] = useState<Record<number, { startTime: string; endTime: string; name: string }>>({});

  // Yeni qrafik modal
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({ code: '', name: '', startTime: '09:00', endTime: '18:00' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await schedulesApi.getAll(true);  // include inactive
      setConfigs(data);
      const initial: Record<number, { startTime: string; endTime: string; name: string }> = {};
      data.forEach((c) => { initial[c.id] = { startTime: c.startTime, endTime: c.endTime, name: c.name }; });
      setTimes(initial);
    } catch {
      toast.error('Qrafik yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSave = async (config: ScheduleConfig) => {
    const t = times[config.id];
    if (!t) return;
    setSaving(config.id);
    try {
      await schedulesApi.update(config.id, { name: t.name, startTime: t.startTime, endTime: t.endTime });
      toast.success('Qrafik yadda saxlanıldı');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async (config: ScheduleConfig) => {
    try {
      await schedulesApi.update(config.id, { isActive: !config.isActive });
      toast.success(config.isActive ? 'Qrafik deaktiv edildi' : 'Qrafik aktiv edildi');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu qrafiki silmək istədiyinizdən əminsiniz? (uşaqlar bu kodu istifadə edirsə yalnız deaktiv olacaq)')) return;
    setDeletingId(id);
    try {
      await schedulesApi.delete(id);
      toast.success('Qrafik silindi');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    if (!addForm.code.trim() || !addForm.name.trim()) {
      toast.error('Kod və ad mütləqdir');
      return;
    }
    setAddLoading(true);
    try {
      await schedulesApi.create({
        code: addForm.code.trim(),
        name: addForm.name.trim(),
        startTime: addForm.startTime,
        endTime: addForm.endTime,
      });
      toast.success('Yeni qrafik əlavə edildi');
      setAddOpen(false);
      setAddForm({ code: '', name: '', startTime: '09:00', endTime: '18:00' });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setAddLoading(false);
    }
  };

  if (!permissions.schedule.view) return null;
  const canEdit = permissions.schedule.edit;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qrafik"
        description="Gündəlik iş qrafikinin parametrləri"
        actions={canEdit ? (
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={15} /> Yeni qrafik
          </Button>
        ) : undefined}
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
        ) : configs.length === 0 ? (
          <div className="md:col-span-2 text-center py-12 text-sm text-gray-400">
            Hələ heç bir qrafik yoxdur. Yuxarıdan yeni əlavə edin.
          </div>
        ) : (
          configs.map((config) => {
            const meta = metaFor(config.code);
            const t = times[config.id] ?? { startTime: config.startTime, endTime: config.endTime, name: config.name };
            const isBuiltin = config.code === 'FullDay' || config.code === 'HalfDay';
            return (
              <div
                key={config.id}
                className={cn(
                  'bg-white dark:bg-[#1e2130] border-2 rounded-2xl p-5',
                  meta.color,
                  !config.isActive && 'opacity-60'
                )}
              >
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl">{meta.icon}</span>
                    {canEdit ? (
                      <input
                        value={t.name}
                        onChange={(e) => setTimes((prev) => ({ ...prev, [config.id]: { ...prev[config.id], name: e.target.value } }))}
                        className="text-base font-bold text-gray-900 dark:text-gray-50 font-display bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary outline-none flex-1 min-w-0"
                      />
                    ) : (
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 font-display truncate">{config.name}</h3>
                    )}
                  </div>
                  {!config.isActive && <Badge variant="inactive" size="xs">Deaktiv</Badge>}
                </div>

                <div className="text-[11px] text-gray-500 mb-2">
                  Kod: <span className="font-mono">{config.code}</span>
                  {isBuiltin && <span className="ml-2 text-blue-600">(sistem)</span>}
                </div>

                <div className="flex items-center gap-3 mb-4 p-3 bg-white/70 dark:bg-gray-700/40 rounded-xl flex-wrap">
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

                {canEdit && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleToggleActive(config)}
                      title={config.isActive ? 'Deaktiv et' : 'Aktiv et'}
                    >
                      <Power size={13} /> {config.isActive ? 'Deaktiv et' : 'Aktiv et'}
                    </Button>
                    {!isBuiltin && (
                      <Button
                        size="sm"
                        variant="danger"
                        loading={deletingId === config.id}
                        onClick={() => handleDelete(config.id)}
                      >
                        <Trash2 size={13} /> Sil
                      </Button>
                    )}
                    <Button
                      size="sm"
                      loading={saving === config.id}
                      onClick={() => handleSave(config)}
                    >
                      <Save size={13} /> Saxla
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal open={addOpen} onOpenChange={(o) => { if (!addLoading) setAddOpen(o); }}>
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>Yeni qrafik</ModalTitle>
            <p className="text-xs text-gray-500 mt-1">
              Müxtəlif iş rejimləri üçün qrafik yarat (Tam gün, Yarım gün, Axşam qrupu və s.).
            </p>
          </ModalHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Kod <span className="text-rose-500">*</span>{' '}
                <span className="text-gray-400 font-normal">(latın hərfləri, məs. <b>Evening</b>, <b>Weekend</b>)</span>
              </label>
              <Input
                value={addForm.code}
                onChange={(e) => setAddForm((p) => ({ ...p, code: e.target.value.replace(/[^A-Za-z0-9_-]/g, '') }))}
                placeholder="Evening"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Ad <span className="text-rose-500">*</span>{' '}
                <span className="text-gray-400 font-normal">(istifadəçiyə göstərilən)</span>
              </label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Axşam qrupu"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Başlama</label>
                <TimeInput value={addForm.startTime} onChange={(v) => setAddForm((p) => ({ ...p, startTime: v }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bitmə</label>
                <TimeInput value={addForm.endTime} onChange={(v) => setAddForm((p) => ({ ...p, endTime: v }))} />
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" size="sm" disabled={addLoading} onClick={() => setAddOpen(false)}>
              <X size={13} /> Ləğv et
            </Button>
            <Button size="sm" loading={addLoading} onClick={handleCreate}>
              <Plus size={13} /> Əlavə et
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
