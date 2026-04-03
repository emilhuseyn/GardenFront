'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { ChildStatusBadge } from '@/components/children/ChildStatusBadge';
import { ChildForm } from '@/components/children/ChildForm';
import { groupsApi } from '@/lib/api/groups';
import { formatDate } from '@/lib/utils/format';
import type { GroupDetail, GroupLogResponse } from '@/types';
import Link from 'next/link';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logs, setLogs] = useState<GroupLogResponse[]>([]);
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

    const [groupResult, logsResult] = await Promise.allSettled([
      groupsApi.getById(numId),
      groupsApi.getLogs(numId),
    ]);

    if (groupResult.status === 'fulfilled') {
      setGroup(groupResult.value);
    } else {
      setGroup(null);
    }

    if (logsResult.status === 'fulfilled') {
      setLogs(logsResult.value);
    } else {
      setLogs([]);
    }

    setLoading(false);
    setLogsLoading(false);
  }, [numId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={15} /> Geri qayıt
      </button>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      ) : (
        <PageHeader
          title={group?.name ?? ''}
          description={[group?.ageCategory, group?.teacherName].filter(Boolean).join(' • ')}
          badge={<Badge variant="green" size="sm">{group?.language}</Badge>}
          actions={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus size={14} /> Uşaq əlavə et
            </Button>
          }
        />
      )}

      <div className="bg-white border border-white-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white-border bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Uşaq</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Qrafik</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white-border">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"></td>
                </tr>
              ))
            ) : (
              group?.children.map((child) => (
                <tr key={child.id} className="border-b border-white-border hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={child.fullName} size="sm" />
                      <p className="text-sm font-medium text-gray-800">{child.fullName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="teal" size="xs">
                      {child.scheduleType === 'FullDay' ? '☀️ Tam' : '🌤 Yarım'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ChildStatusBadge isActive={child.status === 'Active'} size="xs" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/children/${child.id}`}>
                      <Button variant="ghost" size="xs">Bax →</Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && (group?.children.length ?? 0) === 0 && (
          <div className="text-center py-12 text-sm text-gray-400">Bu qrupda uşaq yoxdur</div>
        )}
      </div>

      <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Qrup tarixçəsi</h3>
          {!logsLoading && <Badge variant="blue" size="xs">{logs.length} hadisə</Badge>}
        </div>

        {logsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white-border dark:border-gray-700/60 p-3">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Bu qrup üçün tarixçə qeydi yoxdur.</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const actionLabel =
                log.actionType === 'ChildAdded'
                  ? 'Uşaq əlavə edildi'
                  : log.actionType === 'ChildRemoved'
                    ? 'Uşaq çıxarıldı'
                    : 'Qrup yeniləndi';

              const actionClass =
                log.actionType === 'ChildAdded'
                  ? 'bg-emerald-50 text-emerald-700'
                  : log.actionType === 'ChildRemoved'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-blue-50 text-blue-700';

              return (
                <div key={log.id} className="rounded-xl border border-white-border dark:border-gray-700/60 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${actionClass}`}>
                      {actionLabel}
                    </span>
                    {typeof log.childId === 'number' && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        Uşaq ID: {log.childId}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">
                      {formatDate(log.actionDate, 'dd.MM.yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{log.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Child Modal */}
      <Modal open={addOpen} onOpenChange={setAddOpen}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>Yeni uşaq əlavə et</ModalTitle>
          </ModalHeader>
          <ChildForm
            defaultGroupId={numId}
            onSuccess={() => { setAddOpen(false); load(); }}
            onCancel={() => setAddOpen(false)}
          />
        </ModalContent>
      </Modal>
    </div>
  );
}

