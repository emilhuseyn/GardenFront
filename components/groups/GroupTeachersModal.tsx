'use client';
import { useState, useEffect } from 'react';
import {
  UserCheck, UserX, ArrowRightLeft, Trash2, UserPlus, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { groupsApi } from '@/lib/api/groups';
import { usersApi } from '@/lib/api/users';
import { formatDate } from '@/lib/utils/format';
import type { GroupTeacher, Group, UserResponse } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  allGroups: Group[];
  canManage: boolean;
  onChanged?: () => void;
}

export function GroupTeachersModal({ isOpen, onClose, group, allGroups, canManage, onChanged }: Props) {
  const [teachers, setTeachers] = useState<GroupTeacher[]>([]);
  const [loading, setLoading] = useState(false);

  // Add teacher
  const [allTeachers, setAllTeachers] = useState<UserResponse[]>([]);
  const [addUserId, setAddUserId] = useState('');
  const [adding, setAdding] = useState(false);

  // Move
  const [movingUserId, setMovingUserId] = useState<string | null>(null);
  const [moveTargetGroupId, setMoveTargetGroupId] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);

  // Toggle / Remove
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await groupsApi.getTeachers(group.id);
      setTeachers(data);
    } catch {
      toast.error('Müəllimlər yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void load();
    if (canManage) {
      usersApi.getByRole('Teacher').then(setAllTeachers).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, group.id]);

  const assignedIds = new Set(teachers.map((t) => t.userId));
  const availableToAdd = allTeachers.filter((t) => !assignedIds.has(t.id));
  const otherGroups = allGroups.filter((g) => g.id !== group.id);

  const handleAdd = async () => {
    if (!addUserId) return;
    setAdding(true);
    try {
      await groupsApi.addTeacher(group.id, addUserId);
      setAddUserId('');
      await load();
      onChanged?.();
      toast.success('Müəllim qrupa əlavə edildi');
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Xəta baş verdi');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (teacher: GroupTeacher) => {
    setTogglingId(teacher.userId);
    try {
      const newActive = await groupsApi.toggleTeacherActive(group.id, teacher.userId);
      setTeachers((prev) =>
        prev.map((t) => t.userId === teacher.userId ? { ...t, isActive: newActive } : t)
      );
      toast.success(newActive ? 'Müəllim aktivləşdirildi' : 'Müəllim deaktivləşdirildi');
      onChanged?.();
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Xəta baş verdi');
    } finally {
      setTogglingId(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await groupsApi.removeTeacher(group.id, userId);
      setTeachers((prev) => prev.filter((t) => t.userId !== userId));
      onChanged?.();
      toast.success('Müəllim qrupdan çıxarıldı');
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Xəta baş verdi');
    } finally {
      setRemovingId(null);
    }
  };

  const handleMove = async (userId: string) => {
    if (!moveTargetGroupId) return;
    setMoveLoading(true);
    try {
      await groupsApi.moveTeacher(group.id, userId, Number(moveTargetGroupId));
      setTeachers((prev) => prev.filter((t) => t.userId !== userId));
      setMovingUserId(null);
      setMoveTargetGroupId('');
      onChanged?.();
      const targetName = allGroups.find((g) => g.id === Number(moveTargetGroupId))?.name ?? '';
      toast.success(`Müəllim "${targetName}" qrupuna köçürüldü`);
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? 'Xəta baş verdi');
    } finally {
      setMoveLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>Müəllimlər — {group.name}</ModalTitle>
        </ModalHeader>

        <div className="space-y-4">
          {/* Add teacher row */}
          {canManage && availableToAdd.length > 0 && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  options={[
                    { value: '', label: 'Müəllim seçin...' },
                    ...availableToAdd.map((t) => ({
                      value: t.id,
                      label: `${t.firstName} ${t.lastName}`,
                    })),
                  ]}
                />
              </div>
              <Button onClick={handleAdd} loading={adding} disabled={!addUserId} className="gap-1.5 shrink-0">
                <UserPlus size={16} />
                Əlavə et
              </Button>
            </div>
          )}

          {/* Teachers list */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-500" />
            </div>
          ) : teachers.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              Bu qrupa heç bir müəllim təyin edilməyib.
            </p>
          ) : (
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <div key={teacher.userId}>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/30">
                    <Avatar name={teacher.fullName} size="sm" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {teacher.fullName}
                        </span>
                        <Badge variant={teacher.isActive ? 'active' : 'inactive'}>
                          {teacher.isActive ? 'Aktiv' : 'Deaktiv'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {teacher.email} · {formatDate(teacher.assignedAt, 'dd MMM yyyy')}
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Toggle active */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title={teacher.isActive ? 'Deaktiv et' : 'Aktiv et'}
                          loading={togglingId === teacher.userId}
                          onClick={() => handleToggleActive(teacher)}
                          className={teacher.isActive
                            ? 'text-amber-500 hover:text-amber-600'
                            : 'text-green-500 hover:text-green-600'}
                        >
                          {teacher.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </Button>

                        {/* Move */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Qrupa köçür"
                          onClick={() => {
                            setMovingUserId((prev) => prev === teacher.userId ? null : teacher.userId);
                            setMoveTargetGroupId('');
                          }}
                          className="text-blue-500 hover:text-blue-600"
                          disabled={otherGroups.length === 0}
                        >
                          <ArrowRightLeft size={16} />
                        </Button>

                        {/* Remove */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Qrupdan çıxar"
                          loading={removingId === teacher.userId}
                          onClick={() => handleRemove(teacher.userId)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Inline move panel */}
                  {movingUserId === teacher.userId && (
                    <div className="ml-3 mt-1 flex gap-2 p-2 rounded-b-xl bg-blue-50 dark:bg-blue-900/10 border border-t-0 border-blue-100 dark:border-blue-700/30">
                      <div className="flex-1">
                        <Select
                          value={moveTargetGroupId}
                          onChange={(e) => setMoveTargetGroupId(e.target.value)}
                          options={[
                            { value: '', label: 'Hansı qrupa köçürülsün?' },
                            ...otherGroups.map((g) => ({ value: String(g.id), label: g.name })),
                          ]}
                        />
                      </div>
                      <Button
                        size="sm"
                        loading={moveLoading}
                        disabled={!moveTargetGroupId}
                        onClick={() => handleMove(teacher.userId)}
                        className="gap-1.5 shrink-0"
                      >
                        <ChevronDown size={14} />
                        Köçür
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>Bağla</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
