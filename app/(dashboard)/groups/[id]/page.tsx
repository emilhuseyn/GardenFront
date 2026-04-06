'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, UserPlus, Users, Activity, GraduationCap, Clock, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ChildStatusBadge } from '@/components/children/ChildStatusBadge';
import { ChildForm } from '@/components/children/ChildForm';
import { groupsApi } from '@/lib/api/groups';
import { usersApi } from '@/lib/api/users';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/constants';
import type { GroupDetail, GroupLogResponse, GroupTeacher, UserResponse } from '@/types';
import Link from 'next/link';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logs, setLogs] = useState<GroupLogResponse[]>([]);
  const [groupTeachers, setGroupTeachers] = useState<GroupTeacher[]>([]);
  const [teachers, setTeachers] = useState<UserResponse[]>([]);
  const [teacherManageOpen, setTeacherManageOpen] = useState(false);
  const [teacherSelection, setTeacherSelection] = useState('');
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [addTeacherLoading, setAddTeacherLoading] = useState(false);
  const [removingTeacherId, setRemovingTeacherId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const numId = Number(id);

  const load = useCallback(async () => {
    if (!Number.isFinite(numId)) {
      setGroup(null);
      setLogs([]);
      setLoading(false);
      setLogsLoading(false);
      return;
    }

    setLoading(true);
    setLogsLoading(true);

    try {
      const [groupResult, logsResult] = await Promise.all([
        groupsApi.getById(numId),
        groupsApi.getLogs(numId),
      ]);
      setGroup(groupResult);
      setLogs(logsResult);

      try {
        const teachersResult = await groupsApi.getTeachers(numId);
        setGroupTeachers(teachersResult);
      } catch {
        setGroupTeachers([]);
      }
    } catch (e) {
      console.error(e);
      setGroup(null);
      setLogs([]);
      setGroupTeachers([]);
    } finally {
      setLoading(false);
      setLogsLoading(false);
    }
  }, [numId]);

  useEffect(() => { load(); }, [load]);

  const loadTeachers = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const teachersResult = await usersApi.getByRole('Teacher');
      setTeachers(teachersResult);
    } catch {
      setTeachers([]);
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  const refreshGroupTeachers = useCallback(async () => {
    if (!Number.isFinite(numId)) {
      setGroupTeachers([]);
      return;
    }

    try {
      const teachersResult = await groupsApi.getTeachers(numId);
      setGroupTeachers(teachersResult);
    } catch {
      setGroupTeachers([]);
    }
  }, [numId]);

  const openTeacherManageModal = async () => {
    setTeacherManageOpen(true);
    setTeacherSelection('');
    await Promise.all([loadTeachers(), refreshGroupTeachers()]);
  };

  const onAddTeacher = async () => {
    if (!teacherSelection) {
      toast.error('Müəllim seçin');
      return;
    }

    if (groupTeachers.some((teacher) => teacher.userId === teacherSelection)) {
      toast.error('Bu müəllim artıq qrupdadır');
      return;
    }

    setAddTeacherLoading(true);
    try {
      await groupsApi.addTeacher(numId, teacherSelection);
      await refreshGroupTeachers();
      setTeacherSelection('');
      toast.success('Müəllim qrupa əlavə edildi');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Müəllim əlavə edilə bilmədi');
    } finally {
      setAddTeacherLoading(false);
    }
  };

  const onRemoveTeacher = async (userId: string) => {
    setRemovingTeacherId(userId);
    try {
      await groupsApi.removeTeacher(numId, userId);
      await refreshGroupTeachers();
      toast.success('Müəllim qrupdan çıxarıldı');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Müəllim çıxarıla bilmədi');
    } finally {
      setRemovingTeacherId(null);
    }
  };

  const activeChildren = group?.children.filter(c => c.status === 'Active').length || 0;
  const totalChildren = group?.children.length || 0;
  const teacherNames = groupTeachers.map((teacher) => teacher.fullName);
  const teacherLabel = teacherNames.length > 0 ? teacherNames.join(', ') : (group?.teacherName || 'Təyin edilməyib');
  const assignableTeacherOptions = teachers
    .filter((teacher) => !groupTeachers.some((assignedTeacher) => assignedTeacher.userId === teacher.id))
    .map((teacher) => ({ value: teacher.id, label: `${teacher.firstName} ${teacher.lastName}` }));
  const sortedChildren = [...(group?.children ?? [])].sort((a, b) => {
    if (a.status === b.status) return a.fullName.localeCompare(b.fullName, 'az');
    return a.status === 'Active' ? -1 : 1;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors group"
      >
        <div className="p-1.5 rounded-full bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-800 dark:group-hover:bg-gray-700 transition-colors">
          <ArrowLeft size={16} />
        </div>
        Bütün Qruplara qayıt
      </button>

      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-[#1e2130] border border-gray-100 dark:border-gray-800 p-6 shadow-sm flex items-center justify-between gap-4">
        <div className="space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-none shadow-none text-xs font-medium px-2 py-0.5 uppercase">
                  {group?.language} Bölməsi
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {group?.name}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2">
                <GraduationCap size={16} />
                Müəllimlər: <span className="font-medium text-gray-700 dark:text-gray-300">{teacherLabel}</span>
                <span className="mx-1">•</span>
                Yaş qrupu: <span className="font-medium text-gray-700 dark:text-gray-300">{group?.ageCategory}</span>
              </p>
            </>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button variant="secondary" onClick={openTeacherManageModal}>Müəllimləri idarə et</Button>
          <Button 
            onClick={() => setAddOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <UserPlus size={16} className="mr-2" /> 
            Uşaq Əlavə Et
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1e2130] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ümumi Uşaq</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {loading ? <Skeleton className="h-8 w-16" /> : totalChildren}
            </p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#1e2130] rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aktiv Uşaqlar</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {loading ? <Skeleton className="h-8 w-16" /> : activeChildren}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Children List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={20} className="text-indigo-500" />
              Qrupdakı Uşaqlar ({(group?.children.length ?? 0)})
            </h2>
          </div>
          
          <div className="bg-white dark:bg-[#1e2130] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : totalChildren === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800/50 mb-4">
                  <Info className="text-gray-400 dark:text-gray-500" size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Hələki uşaq qeydiyyatı yoxdur</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">Bu qrupa hələ uşaq əlavə edilməyib. Yeni uşaq əlavə edərək prosesə başlayın.</p>
                <Button onClick={() => setAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  <UserPlus size={16} className="mr-2" /> İlk uşağı əlavə et
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {sortedChildren.map((child) => (
                  <Link 
                    href={`/children/${child.id}`} 
                    key={child.id}
                    className={cn(
                      'flex items-center p-4 transition-colors group cursor-pointer',
                      child.status === 'Active'
                        ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        : 'bg-gray-50/70 dark:bg-gray-800/30 hover:bg-gray-100/80 dark:hover:bg-gray-800/50'
                    )}
                  >
                    <div className="relative">
                      <Avatar name={child.fullName} size="md" className="ring-2 ring-white dark:ring-[#1e2130] shadow-sm" />
                      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white dark:border-[#1e2130] rounded-full ${child.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                    </div>
                    
                    <div className="ml-4 flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-semibold truncate transition-colors',
                        child.status === 'Active'
                          ? 'text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                          : 'text-gray-500 dark:text-gray-400 line-through'
                      )}>
                        {child.fullName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <ChildStatusBadge isActive={child.status === 'Active'} size="xs" />
                        <Badge 
                          variant={child.scheduleType === 'FullDay' ? 'blue' : 'amber'} 
                          size="xs"
                          className="font-medium"
                        >
                          {child.scheduleType === 'FullDay' ? '☀️ Tam Gün' : '🌤 Yarım Gün'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0 ml-4">
                      <div className="p-2 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shrink-0">
                        <ArrowLeft size={16} className="hidden" /> {/* Placeholder */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar logs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity size={20} className="text-pink-500" />
              Tarixçə qeydləri
            </h2>
          </div>

          <div className="bg-white dark:bg-[#1e2130] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-bl-full pointer-events-none"></div>
            
            <div className="relative">
              {!logsLoading && (
                <div className="absolute left-8 top-2 bottom-2 w-px bg-gray-100 dark:bg-gray-800 -z-10"></div>
              )}

              {logsLoading ? (
                <div className="space-y-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Activity size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Heç bir tarixçə qeydi tapılmadı.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {logs.slice(0, 10).map((log) => { // Sadece en son 10 log'u goster
                    const isAdded = log.actionType === 'ChildAdded';
                    const isRemoved = log.actionType === 'ChildRemoved';
                    
                    return (
                      <div key={log.id} className="flex gap-4 group">
                        <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-[#1e2130] z-10 
                          ${isAdded ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                            isRemoved ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 
                            'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}
                        >
                          {isAdded ? (
                            <UserPlus size={14} />
                          ) : isRemoved ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="23" y1="8" y2="12"/><line x1="23" x2="19" y1="8" y2="12"/></svg>
                          ) : (
                            <Activity size={14} />
                          )}
                        </div>
                        
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 border border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-700 transition-colors">
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-tight mb-1 font-medium">{log.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={12} />
                              {formatDate(log.actionDate, 'dd MMM, HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {logs.length > 10 && (
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm" className="text-gray-500 w-full">Bütün qeydlərə bax</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Child Modal */}
      <Modal open={addOpen} onOpenChange={setAddOpen}>
        <ModalContent size="lg" className="sm:max-w-xl">
          <ModalHeader className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <UserPlus size={20} />
              </div>
              <div>
                <ModalTitle className="text-xl">Yeni uşaq əlavə et</ModalTitle>
                <p className="text-sm text-gray-500 mt-1">Bu uşağı <span className="font-semibold text-gray-700 dark:text-gray-300">{group?.name}</span> qrupuna əlavə edirsiniz</p>
              </div>
            </div>
          </ModalHeader>
          <div className="px-1">
            <ChildForm
              defaultGroupId={numId}
              onSuccess={() => { setAddOpen(false); load(); }}
              onCancel={() => setAddOpen(false)}
            />
          </div>
        </ModalContent>
      </Modal>

      {/* Teacher Manage Modal */}
      <Modal open={teacherManageOpen} onOpenChange={setTeacherManageOpen}>
        <ModalContent size="md">
          <ModalHeader>
            <ModalTitle>Müəllimləri idarə et</ModalTitle>
          </ModalHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Cari müəllimlər</p>
              {groupTeachers.length === 0 ? (
                <p className="text-sm text-gray-400">Bu qrupda müəllim yoxdur.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {groupTeachers.map((teacher) => (
                    <div key={teacher.userId} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{teacher.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{teacher.email}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        loading={removingTeacherId === teacher.userId}
                        onClick={() => onRemoveTeacher(teacher.userId)}
                      >
                        Çıxar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Select
                label="Yeni müəllim"
                value={teacherSelection}
                onChange={(event) => setTeacherSelection(event.target.value)}
                options={[{ value: '', label: teachersLoading ? 'Yüklənir...' : 'Müəllim seçin' }, ...assignableTeacherOptions]}
              />
              {!teachersLoading && assignableTeacherOptions.length === 0 && (
                <p className="text-xs text-gray-400">Əlavə edilə biləcək müəllim yoxdur.</p>
              )}
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setTeacherManageOpen(false)}>Bağla</Button>
            <Button type="button" loading={addTeacherLoading} onClick={onAddTeacher}>Əlavə et</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

