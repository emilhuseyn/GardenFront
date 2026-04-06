'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Plus, Users, ChevronRight, Trash2, Pencil, User, Search, X, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Modal, ModalHeader, ModalTitle, ModalFooter, ModalContent } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils/constants';
import { groupsApi, divisionsApi } from '@/lib/api/groups';
import { Skeleton } from '@/components/ui/Skeleton';
import { usersApi } from '@/lib/api/users';
import { useAuthStore, getPermissions } from '@/lib/stores/authStore';
import type { Group, Division, UserResponse, GroupTeacher } from '@/types';

const COLOR_CYCLE = [
  'border-green-400 bg-green-50',
  'border-blue-400 bg-blue-50',
  'border-violet-400 bg-violet-50',
  'border-amber-400 bg-amber-50',
];

const LANGUAGE_OPTIONS = [
  { value: 'Az', label: 'Azerbaycan' },
  { value: 'Ru', label: 'Rus' },
  { value: 'En', label: 'Ingilis' },
];

const AGE_OPTIONS = [
  { value: '2-3 yas', label: '2-3 yas' },
  { value: '3-4 yas', label: '3-4 yas' },
  { value: '4-5 yas', label: '4-5 yas' },
  { value: '5-6 yas', label: '5-6 yas' },
  { value: '6-7 yas', label: '6-7 yas' },
];

interface GroupFormValues {
  name: string;
  divisionId: number;
  teacherId: string;
  maxChildCount: number;
  ageCategory: string;
  language: string;
}

export default function GroupsPage() {
  const { user } = useAuthStore();
  const perms = getPermissions(user?.role);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teachers, setTeachers] = useState<UserResponse[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [deleteModal, setDelete]       = useState<number | null>(null);
  const [editModal, setEditModal]      = useState<Group | null>(null);
  const [assignTeacherModal, setAssignTeacherModal] = useState<{ group: Group; selectedTeacherId: string } | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [removingTeacherId, setRemovingTeacherId] = useState<string | null>(null);
  const [teachersByGroup, setTeachersByGroup] = useState<Record<number, GroupTeacher[]>>({});
  const [teachersByGroupLoading, setTeachersByGroupLoading] = useState<Record<number, boolean>>({});

  // ── Filter & sort state ───────────────────────────────────────────────────
  const [search, setSearch]             = useState('');
  const [filterDivision, setFilterDivision] = useState('all');
  const [filterAge, setFilterAge]       = useState('all');
  const [filterLang, setFilterLang]     = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('all'); // 'all' | 'has' | 'none'
  type SortField = 'name' | 'capacity' | 'fill';
  const [sortField, setSortField]       = useState<SortField>('name');
  const [sortAsc, setSortAsc]           = useState(true);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortAsc((v) => !v);
    else { setSortField(f); setSortAsc(true); }
  };

  const activeFilters: { key: string; label: string; clear: () => void }[] = [
    ...(search ? [{ key: 'search', label: `"${search}"`, clear: () => setSearch('') }] : []),
    ...(filterDivision !== 'all' ? [{ key: 'div', label: divisions.find(d => String(d.id) === filterDivision)?.name ?? filterDivision, clear: () => setFilterDivision('all') }] : []),
    ...(filterAge  !== 'all' ? [{ key: 'age',  label: filterAge,  clear: () => setFilterAge('all') }] : []),
    ...(filterLang !== 'all' ? [{ key: 'lang', label: filterLang === 'Az' ? 'Azərbaycanca' : filterLang === 'Ru' ? 'Rusca' : 'İngiliscə', clear: () => setFilterLang('all') }] : []),
    ...(filterTeacher !== 'all' ? [{ key: 'teacher', label: filterTeacher === 'has' ? 'Müəllim var' : 'Müəllim yox', clear: () => setFilterTeacher('all') }] : []),
  ];

  const clearAll = () => { setSearch(''); setFilterDivision('all'); setFilterAge('all'); setFilterLang('all'); setFilterTeacher('all'); };

  const getTeacherCount = (group: Group) => {
    const groupTeachers = teachersByGroup[group.id];
    if (groupTeachers !== undefined) return groupTeachers.length;
    return group.teacherName ? 1 : 0;
  };

  const getTeacherPreview = (group: Group) => {
    const groupTeachers = teachersByGroup[group.id];
    if (groupTeachers !== undefined) {
      if (groupTeachers.length === 0) return null;
      return {
        firstTeacher: groupTeachers[0].fullName,
        extraCount: Math.max(0, groupTeachers.length - 1),
      };
    }

    if (group.teacherName) {
      return {
        firstTeacher: group.teacherName,
        extraCount: 0,
      };
    }

    return null;
  };

  const loadGroupTeachers = async (groupId: number) => {
    setTeachersByGroupLoading((prev) => ({ ...prev, [groupId]: true }));
    try {
      const groupTeachers = await groupsApi.getTeachers(groupId);
      setTeachersByGroup((prev) => ({ ...prev, [groupId]: groupTeachers }));
      return groupTeachers;
    } catch {
      return teachersByGroup[groupId] ?? [];
    } finally {
      setTeachersByGroupLoading((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const filteredGroups = groups
    .filter((g) => {
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterDivision !== 'all' && String(g.divisionId) !== filterDivision) return false;
      if (filterAge  !== 'all' && g.ageCategory !== filterAge)  return false;
      if (filterLang !== 'all' && g.language    !== filterLang) return false;
      const teacherCount = getTeacherCount(g);
      if (filterTeacher === 'has'  && teacherCount === 0) return false;
      if (filterTeacher === 'none' && teacherCount > 0) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name')     cmp = a.name.localeCompare(b.name);
      else if (sortField === 'capacity') cmp = a.maxChildCount - b.maxChildCount;
      else cmp = (a.currentChildCount / a.maxChildCount) - (b.currentChildCount / b.maxChildCount);
      return sortAsc ? cmp : -cmp;
    });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GroupFormValues>({
    defaultValues: { maxChildCount: 15, ageCategory: '3-4 yas', language: 'Az' },
  });

  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors, isSubmitting: editSubmitting } } = useForm<GroupFormValues>();

  useEffect(() => {
    groupsApi.getAll().then(setGroups).catch(() => {}).finally(() => setLoading(false));
    if (perms.groups.create) {
      divisionsApi.getAll().then(setDivisions).catch(() => {});
      usersApi.getByRole('Teacher').then(setTeachers).catch(() => {});
    }
  }, [perms.groups.create]);

  useEffect(() => {
    if (groups.length === 0) {
      setTeachersByGroup({});
      return;
    }

    let cancelled = false;
    const loadAllTeachers = async () => {
      const results = await Promise.allSettled(groups.map((group) => groupsApi.getTeachers(group.id)));
      if (cancelled) return;

      const nextMap: Record<number, GroupTeacher[]> = {};
      groups.forEach((group, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          nextMap[group.id] = result.value;
        }
      });
      setTeachersByGroup(nextMap);
    };

    void loadAllTeachers();
    return () => {
      cancelled = true;
    };
  }, [groups]);

  const divisionOptions = divisions.map((d) => ({ value: String(d.id), label: d.name }));
  const teacherOptions = teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }));

  const openCreate = () => { reset(); setCreateModal(true); };

  const openEdit = (group: Group) => {
    resetEdit({
      name:          group.name,
      divisionId:    group.divisionId,
      teacherId:     group.teacherId ?? '',
      maxChildCount: group.maxChildCount,
      ageCategory:   group.ageCategory,
      language:      group.language,
    });
    setEditModal(group);
  };

  const openAssignTeacher = (group: Group) => {
    setAssignTeacherModal({ group, selectedTeacherId: '' });
    void loadGroupTeachers(group.id);
  };

  const onAssignTeacher = async () => {
    if (!assignTeacherModal || !assignTeacherModal.selectedTeacherId) {
      toast.error('Müəllim seçin');
      return;
    }

    const currentTeachers = teachersByGroup[assignTeacherModal.group.id] ?? [];
    if (currentTeachers.some((teacher) => teacher.userId === assignTeacherModal.selectedTeacherId)) {
      toast.error('Bu müəllim artıq qrupdadır');
      return;
    }

    setAssignLoading(true);
    try {
      await groupsApi.addTeacher(assignTeacherModal.group.id, assignTeacherModal.selectedTeacherId);

      const selectedTeacher = teachers.find((teacher) => teacher.id === assignTeacherModal.selectedTeacherId);
      if (selectedTeacher) {
        const newTeacher: GroupTeacher = {
          userId: selectedTeacher.id,
          fullName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`,
          email: selectedTeacher.email,
          assignedAt: new Date().toISOString(),
        };

        setTeachersByGroup((prev) => ({
          ...prev,
          [assignTeacherModal.group.id]: [...(prev[assignTeacherModal.group.id] ?? []), newTeacher],
        }));
      } else {
        await loadGroupTeachers(assignTeacherModal.group.id);
      }

      setAssignTeacherModal((prev) => prev ? { ...prev, selectedTeacherId: '' } : prev);
      toast.success('Müəllim qrupa əlavə edildi');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setAssignLoading(false);
    }
  };

  const onRemoveTeacher = async (groupId: number, userId: string) => {
    setRemovingTeacherId(userId);
    try {
      await groupsApi.removeTeacher(groupId, userId);
      setTeachersByGroup((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] ?? []).filter((teacher) => teacher.userId !== userId),
      }));
      toast.success('Müəllim qrupdan çıxarıldı');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setRemovingTeacherId(null);
    }
  };

  const onEditSubmit = async (data: GroupFormValues) => {
    if (!editModal) return;
    try {
      const updated = await groupsApi.update(editModal.id, {
        name:          data.name,
        divisionId:    Number(data.divisionId),
        teacherId:     data.teacherId || undefined,
        maxChildCount: Number(data.maxChildCount),
        ageCategory:   data.ageCategory,
        language:      data.language,
      });
      setGroups((prev) => prev.map((g) => g.id === editModal.id ? { ...g, ...updated } : g));
      setEditModal(null);
      toast.success('Qrup yeniləndi');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    }
  };

  const onCreateSubmit = async (data: GroupFormValues) => {
    try {
      const created = await groupsApi.create({
        name: data.name,
        divisionId: Number(data.divisionId),
        teacherId: data.teacherId,
        maxChildCount: Number(data.maxChildCount),
        ageCategory: data.ageCategory,
        language: data.language,
      });
      setGroups((prev) => [...prev, created]);
      setCreateModal(false);
      toast.success('Qrup uğurla yaradıldı');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    }
  };

  const onDelete = async () => {
    if (deleteModal === null) return;
    try {
      await groupsApi.delete(deleteModal);
      setGroups((prev) => prev.filter((g) => g.id !== deleteModal));
      setTeachersByGroup((prev) => {
        const next = { ...prev };
        delete next[deleteModal];
        return next;
      });
      toast.success('Qrup silindi');
    } catch {
      toast.error('Silinərkən xəta baş verdi');
    } finally {
      setDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qruplar"
        description="Mövcud qrupların idarə edilməsi"
        actions={
          perms.groups.create ? (
            <Button onClick={openCreate}>
              <Plus size={15} /> Yeni qrup
            </Button>
          ) : undefined
        }
      />

      {/* ── Filter bar ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qrup adı axtar..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {/* Division */}
          <select
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Bütün bölmələr</option>
            {divisions.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
          {/* Age */}
          <select
            value={filterAge}
            onChange={(e) => setFilterAge(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Bütün yaşlar</option>
            {AGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {/* Language */}
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Bütün dillər</option>
            <option value="Az">🇦🇿 Azərbaycanca</option>
            <option value="Ru">🇷🇺 Rusca</option>
            <option value="En">🇬🇧 İngiliscə</option>
          </select>
          {/* Teacher presence */}
          <select
            value={filterTeacher}
            onChange={(e) => setFilterTeacher(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Bütün qruplar</option>
            <option value="has">Müəllim var</option>
            <option value="none">Müəllim yox</option>
          </select>
        </div>

        {/* Sort + result count */}
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="mr-1">Sıralama:</span>
          {(['name', 'capacity', 'fill'] as const).map((f) => (
            <button
              key={f}
              onClick={() => toggleSort(f)}
              className={cn(
                'flex items-center gap-0.5 px-2 py-1 rounded-md border transition-colors',
                sortField === f
                  ? 'border-primary/60 bg-primary/10 text-primary font-medium'
                  : 'border-white-border dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700/40'
              )}
            >
              {f === 'name' ? 'Ad' : f === 'capacity' ? 'Tutum' : 'Doluluk'}
              {sortField !== f
                ? <ArrowUpDown size={11} className="opacity-40" />
                : sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          ))}
          <span className="ml-auto text-gray-400">{filteredGroups.length} qrup</span>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {f.label}
                <button onClick={f.clear} className="hover:opacity-70"><X size={10} /></button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
            >
              Hamısını sıfırla
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#1e2130] border-2 border-white-border dark:border-gray-700/60 rounded-2xl p-5 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))
          : filteredGroups.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center gap-2 text-gray-400">
                <Search size={32} className="opacity-30" />
                <p className="text-sm">Heç bir qrup tapılmadı</p>
                {activeFilters.length > 0 && (
                  <button onClick={clearAll} className="text-xs underline hover:text-gray-600">
                    Filterləri sıfırla
                  </button>
                )}
              </div>
            ) : filteredGroups.map((group, i) => {
              const isEnglish = group.language === 'En';
              const teacherPreview = getTeacherPreview(group);
              return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'bg-white dark:bg-[#1e2130] border-2 rounded-2xl p-5 relative overflow-hidden hover:shadow-md transition-shadow',
                COLOR_CYCLE[i % COLOR_CYCLE.length]
              )}
            >
              <span className="absolute top-3 right-3 text-xl">{isEnglish ? '🇬🇧' : '🇦🇿'}</span>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 font-display mb-0.5">{group.name}</h3>
              <p className="text-xs text-gray-400 mb-0.5">{group.divisionName}</p>
              <p className="text-xs text-gray-400 mb-4">{group.ageCategory}</p>
              {teacherPreview && (
                <div className="flex items-center gap-2 mb-4">
                  <Avatar name={teacherPreview.firstTeacher} size="xs" />
                  <span className="text-xs text-gray-600">
                    {teacherPreview.firstTeacher}
                    {teacherPreview.extraCount > 0 ? ` +${teacherPreview.extraCount}` : ''}
                  </span>
                </div>
              )}
              <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Uşaqlar</span>
                <span className="font-medium">{group.currentChildCount}/{group.maxChildCount}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: `${(group.currentChildCount / group.maxChildCount) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/groups/${group.id}`} className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full">
                    <Users size={13} /> Uşaqlar <ChevronRight size={12} />
                  </Button>
                </Link>
                {perms.groups.edit && (
                  <button
                    onClick={() => openAssignTeacher(group)}
                    className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 text-gray-400 hover:text-amber-500 transition-colors"
                    title="Müəllimləri idarə et"
                  >
                    <User size={14} />
                  </button>
                )}
                {perms.groups.edit && (
                  <button
                    onClick={() => openEdit(group)}
                    className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {perms.groups.delete && (
                  <button
                    onClick={() => setDelete(group.id)}
                    className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create modal */}
      <Modal open={createModal} onOpenChange={(open) => !open && setCreateModal(false)}>
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>Yeni qrup yarat</ModalTitle>
          </ModalHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <Input
              {...register('name', { required: 'Ad mutleqdir' })}
              label="Qrupun adı *"
              placeholder="Günəş Qrupu"
              error={errors.name?.message}
            />
            <Select
              {...register('divisionId', { required: 'Bölmə seçin' })}
              label="Bölmə *"
              options={divisionOptions.length > 0 ? divisionOptions : [{ value: '', label: 'API bağlı - bölmə yoxdur' }]}
              error={errors.divisionId?.message}
            />
            <Select
              {...register('teacherId')}
              label="Müəllim"
              options={[{ value: '', label: 'Müəllim seçin (ixtiyari)' }, ...teacherOptions]}
              error={errors.teacherId?.message}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                {...register('ageCategory', { required: true })}
                label="Yas kateqoriyasi *"
                options={AGE_OPTIONS}
              />
              <Select
                {...register('language', { required: true })}
                label="Dil *"
                options={LANGUAGE_OPTIONS}
              />
            </div>
            <Input
              {...register('maxChildCount', { required: true, valueAsNumber: true })}
              label="Maks. uşaq sayı *"
              type="number"
              min={1}
              max={30}
            />
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={() => setCreateModal(false)}>Ləğv et</Button>
              <Button type="submit" loading={isSubmitting}>Yarat</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit modal */}
      <Modal open={editModal !== null} onOpenChange={(open) => !open && setEditModal(null)}>
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>Qrupu redaktə et</ModalTitle>
          </ModalHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <Input
              {...regEdit('name', { required: 'Ad mütəqdir' })}
              label="Qrupun adı *"
              placeholder="Günəş Qrupu"
              error={editErrors.name?.message}
            />
            <Select
              {...regEdit('divisionId', { required: 'Bölmə seçin' })}
              label="Bölmə *"
              options={divisionOptions.length > 0 ? divisionOptions : [{ value: '', label: 'Bölmə yoxdur' }]}
              error={editErrors.divisionId?.message}
            />
            <Select
              {...regEdit('teacherId')}
              label="Müəllim"
              options={[{ value: '', label: 'Müəllim seçin (ixtiyari)' }, ...teacherOptions]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                {...regEdit('ageCategory', { required: true })}
                label="Yaş kateqoriyası *"
                options={AGE_OPTIONS}
              />
              <Select
                {...regEdit('language', { required: true })}
                label="Dil *"
                options={LANGUAGE_OPTIONS}
              />
            </div>
            <Input
              {...regEdit('maxChildCount', { required: true, valueAsNumber: true })}
              label="Maks. uşaq sayı *"
              type="number"
              min={1}
              max={30}
            />
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={() => setEditModal(null)}>Ləğv et</Button>
              <Button type="submit" loading={editSubmitting}>Yadda saxla</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete modal */}
      <Modal open={deleteModal !== null} onOpenChange={(open) => !open && setDelete(null)}>
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>Qrupu sil</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-gray-600">Bu qrupu silmək istədiyinizdən əminsinizmi? Bu əməliyyat geri qaytarıla bilməz.</p>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setDelete(null)}>Ləğv et</Button>
            <Button variant="danger" onClick={onDelete}>Sil</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Assign teacher modal */}
      <Modal open={assignTeacherModal !== null} onOpenChange={(open) => !open && setAssignTeacherModal(null)}>
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>Müəllimləri idarə et</ModalTitle>
          </ModalHeader>
          {assignTeacherModal && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{assignTeacherModal.group.name} qrupuna müəllim əlavə edin və ya çıxarın</p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Cari müəllimlər</p>
                {teachersByGroupLoading[assignTeacherModal.group.id] ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (teachersByGroup[assignTeacherModal.group.id]?.length ?? 0) === 0 ? (
                  <p className="text-xs text-gray-400">Bu qrupda hələ müəllim yoxdur</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {(teachersByGroup[assignTeacherModal.group.id] ?? []).map((teacher) => (
                      <div key={teacher.userId} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{teacher.fullName}</p>
                          <p className="text-xs text-gray-400 truncate">{teacher.email}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          loading={removingTeacherId === teacher.userId}
                          onClick={() => onRemoveTeacher(assignTeacherModal.group.id, teacher.userId)}
                        >
                          Çıxar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Select
                label="Yeni müəllim"
                options={[{ value: '', label: 'Müəllim seçin' }, ...teacherOptions]}
                value={assignTeacherModal.selectedTeacherId}
                onChange={(e) => setAssignTeacherModal({ ...assignTeacherModal, selectedTeacherId: e.target.value })}
              />
            </div>
          )}
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setAssignTeacherModal(null)}>Ləğv et</Button>
            <Button type="button" loading={assignLoading} onClick={onAssignTeacher}>Əlavə et</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
