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
import type { GroupDetail, GroupDetailChild } from '@/types';
import Link from 'next/link';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const numId = Number(id);

  const load = useCallback(() => {
    setLoading(true);
    groupsApi.getById(numId)
      .then(setGroup)
      .catch(() => setGroup(null))
      .finally(() => setLoading(false));
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

