'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/constants';
import { divisionsApi } from '@/lib/api/groups';
import type { Division } from '@/types';

const FLAG: Record<string, string> = {
  // Azerbaijani
  Az: '🇦🇿', Azərbaycan: '🇦🇿', Azerbaijan: '🇦🇿', Azerbaijani: '🇦🇿',
  // English
  İngilis: '🇬🇧', ingilis: '🇬🇧', English: '🇬🇧',
  // Russian
  Rus: '🇷🇺', rus: '🇷🇺', Russian: '🇷🇺', Rusiya: '🇷🇺',
  // French
  Fransız: '🇫🇷', fransız: '🇫🇷', French: '🇫🇷', France: '🇫🇷',
  // German
  Alman: '🇩🇪', alman: '🇩🇪', German: '🇩🇪', Deutschland: '🇩🇪',
  // Spanish
  İspan: '🇪🇸', ispan: '🇪🇸', Spanish: '🇪🇸', Español: '🇪🇸',
  // Turkish
  Türk: '🇹🇷', türk: '🇹🇷', Turkish: '🇹🇷',
  // Arabic
  Ərəb: '🇸🇦', ərəb: '🇸🇦', Arabic: '🇸🇦',
  // Chinese
  Çin: '🇨🇳', çin: '🇨🇳', Chinese: '🇨🇳',
  // Japanese
  Yapon: '🇯🇵', yapon: '🇯🇵', Japanese: '🇯🇵',
  // Italian
  İtalyan: '🇮🇹', italyan: '🇮🇹', Italian: '🇮🇹',
};
const COLOR: Record<string, string> = {
  Az: 'blue', Azərbaycan: 'blue', Azerbaijan: 'blue', Azerbaijani: 'blue',
  İngilis: 'green', ingilis: 'green', English: 'green',
  Rus: 'red', rus: 'red', Russian: 'red', Rusiya: 'red',
  Fransız: 'blue', fransız: 'blue', French: 'blue', France: 'blue',
  Alman: 'amber', alman: 'amber', German: 'amber', Deutschland: 'amber',
  İspan: 'red', ispan: 'red', Spanish: 'red',
  Türk: 'red', türk: 'red', Turkish: 'red',
  Ərəb: 'green', ərəb: 'green', Arabic: 'green',
  Çin: 'red', çin: 'red', Chinese: 'red',
  Yapon: 'red', yapon: 'red', Japanese: 'red',
  İtalyan: 'green', italyan: 'green', Italian: 'green',
};
const BG: Record<string, string> = {
  green:  'from-green-400/10 to-green-400/5 border-green-200',
  blue:   'from-accent-blue/10 to-accent-blue/5 border-blue-200',
  red:    'from-rose-400/10 to-rose-400/5 border-rose-200',
  amber:  'from-amber-400/10 to-amber-400/5 border-amber-200',
};
function getFlag(name: string) {
  for (const key of Object.keys(FLAG)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return FLAG[key];
  }
  return '📚';
}
function getColor(name: string) {
  for (const key of Object.keys(COLOR)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return COLOR[key];
  }
  return 'green';
}

const createSchema = z.object({
  name: z.string().min(2, 'Ad tələb olunur'),
  language: z.string().min(2, 'Dil tələb olunur'),
  description: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);

  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const load = () => {
    setLoading(true);
    divisionsApi.getAll()
      .then(setDivisions)
      .catch(() => toast.error('Bölmələr yüklənmədi'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: CreateForm) => {
    setCreating(true);
    try {
      await divisionsApi.create(data);
      toast.success('Bölmə yaradıldı');
      reset();
      setCreateOpen(false);
      load();
    } catch {
      toast.error('Xəta baş verdi');
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (div: Division) => {
    setSelectedDivision(div);
    resetEdit({
      name: div.name,
      language: div.language,
      description: div.description || '',
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (data: CreateForm) => {
    if (!selectedDivision) return;
    setEditing(true);
    try {
      await divisionsApi.update(selectedDivision.id, data);
      toast.success('Bölmə yeniləndi');
      setEditOpen(false);
      load();
    } catch {
      toast.error('Xəta baş verdi');
    } finally {
      setEditing(false);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [divisionToDelete, setDivisionToDelete] = useState<Division | null>(null);

  const handleDeleteClick = (div: Division) => {
    setDivisionToDelete(div);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!divisionToDelete) return;
    setDeleting(true);
    try {
      await divisionsApi.delete(divisionToDelete.id);
      toast.success('Bölmə silindi');
      setDeleteOpen(false);
      load();
    } catch {
      toast.error('Silinmə zamanı xəta baş verdi. Əmin olun ki, bu bölməyə qruplar bağlı deyil.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bölmələr"
        description="Tədris bölmələrinin idarə edilməsi"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Yeni bölmə
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#1e2130] rounded-2xl border dark:border-gray-700/60 p-6">
              <Skeleton className="h-6 w-40 mb-3" />
              <Skeleton className="h-4 w-56 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            </div>
          ))
        ) : (
          divisions.map((div, i) => {
            const flag = getFlag(div.name);
            const color = getColor(div.name);
            return (
              <motion.div
                key={div.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  'bg-white dark:bg-[#1e2130] rounded-2xl border p-6 bg-gradient-to-br',
                  BG[color] ?? BG.green
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{flag}</span>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 font-display">{div.name}</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{div.description ?? div.language}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEditClick(div)}
                      className="p-2 rounded-lg hover:bg-white/80 transition-colors text-gray-400 hover:text-blue-600"
                    >
                      <Edit size={15} />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(div)}
                      className="p-2 rounded-lg hover:bg-white/80 transition-colors text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white/70 dark:bg-gray-700/40 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-display">{div.groupCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Qrup</p>
                  </div>
                  <div className="bg-white/70 dark:bg-gray-700/40 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mt-3">Dil</p>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{div.language}</p>
                  </div>
                </div>

                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Qrafik</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2.5 bg-white/60 dark:bg-gray-700/40 rounded-lg">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">☀️ Tam günlük</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono-nums">09:00 – 18:00</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white/60 dark:bg-gray-700/40 rounded-lg">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">🌤 Yarım günlük</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono-nums">09:00 – 13:00</span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create modal */}
      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Yeni bölmə yarat</ModalTitle>
          </ModalHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Bölmə adı"
            placeholder="məs. Fransız bölməsi"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Dil"
            placeholder="məs. Fransız"
            error={errors.language?.message}
            {...register('language')}
          />
          <Input
            label="Təsvir (ixtiyari)"
            placeholder="Qısa açıqlama"
            {...register('description')}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { reset(); setCreateOpen(false); }}>
              Ləğv et
            </Button>
            <Button type="submit" className="flex-1" loading={creating}>
              Yarat
            </Button>
          </div>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Bölməni redaktə et</ModalTitle>
          </ModalHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
          <Input
            label="Bölmə adı"
            placeholder="məs. Fransız bölməsi"
            error={editErrors.name?.message}
            {...registerEdit('name')}
          />
          <Input
            label="Dil"
            placeholder="məs. Fransız"
            error={editErrors.language?.message}
            {...registerEdit('language')}
          />
          <Input
            label="Təsvir (ixtiyari)"
            placeholder="Qısa açıqlama"
            {...registerEdit('description')}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>
              Ləğv et
            </Button>
            <Button type="submit" className="flex-1" loading={editing}>
              Yadda saxla
            </Button>
          </div>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete modal */}
      <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ModalContent className="max-w-sm text-center">
          <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
            <Trash2 size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Bölməni sil?</h3>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{divisionToDelete?.name}</span> bölməsini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarılmır.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>
              Ləğv et
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" loading={deleting} onClick={confirmDelete}>
              Bəli, Sil
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
