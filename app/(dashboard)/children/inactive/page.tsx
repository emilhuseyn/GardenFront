'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Users } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { ChildTable } from '@/components/children/ChildTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { childrenApi } from '@/lib/api/children';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { toast } from 'sonner';
import type { Child } from '@/types';

export default function InactiveChildrenPage() {
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const fetchInactive = async () => {
      setLoading(true);
      try {
        let allItems: Child[] = [];
        if (debouncedSearch.trim()) {
            const results = await childrenApi.search(debouncedSearch.trim());
            allItems = results.filter(c => c.status === 'Inactive');
        } else {
            const pageSize = 0;
            const firstPage = await childrenApi.getAll({ status: 'Inactive', page: 1, pageSize });
            allItems = [...firstPage.items];

            if (firstPage.hasNextPage || firstPage.totalPages > 1) {
              const totalPages = Math.max(firstPage.totalPages || 1, 1);
              for (let page = 2; page <= totalPages; page += 1) {
                const nextPage = await childrenApi.getAll(
                  { status: 'Inactive', page, pageSize },
                  { silentError: true }
                );
                allItems = allItems.concat(nextPage.items);
              }
            }
        }
        
        // Remove duplicates just in case
        const uniqueItems = Array.from(new Map(allItems.map((child) => [child.id, child])).values());
        setChildrenList(uniqueItems);
      } catch {
        toast.error('Gözlənilməz xəta baş verdi');
      } finally {
        setLoading(false);
      }
    };

    fetchInactive();
  }, [debouncedSearch]);

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      if (currentStatus === 'Inactive') {
        await childrenApi.activate(id);
        toast.success('Uşaq aktiv edildi');
        setChildrenList(prev => prev.filter(c => c.id !== id));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Xəta baş verdi');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await childrenApi.delete(id);
      toast.success('Uşaq silindi');
      setChildrenList(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Silinmə xətası');
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
      // Basic bulk delete implementation
      try {
          for (const id of ids) {
              await childrenApi.delete(id);
          }
          toast.success(`${ids.length} uşaq silindi`);
          setChildrenList(prev => prev.filter(c => !ids.includes(c.id)));
        } catch {
          toast.error('Silinmə zamanı xəta baş verdi');
      }
  };

  const exportToExcel = () => {
    if (childrenList.length === 0) return;
    const rows = childrenList.map((child) => ({
      ID: child.id,
      Soyad: child.lastName,
      Ad: child.firstName,
      Valideyn: child.parentFullName ?? '',
      'Valideyn telefonu': child.parentPhone ?? '',
      'İkinci valideyn': child.secondParentFullName ?? '',
      'İkinci valideyn telefonu': child.secondParentPhone ?? '',
      Qrup: child.groupName ?? '',
      Bölmə: child.divisionName ?? '',
      'Deaktiv tarix': child.deactivationDate ?? '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Deaktiv uşaqlar');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inactive-children-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const processedChildren = [...childrenList].sort((a, b) => {
      const ln = a.lastName.localeCompare(b.lastName);
      if (ln !== 0) return ln;
      return a.firstName.localeCompare(b.firstName);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader
        title="Deaktiv Uşaqlar"
        description="Ayrılmış və ya deaktiv edilmiş uşaqların siyahısı."
        actions={
          <div className="flex items-center gap-3">
            <Link href="/children">
              <Button variant="outline" className="text-gray-600 dark:text-gray-300">
                <Users size={16} className="mr-2" /> Aktiv Uşaqlar
              </Button>
            </Link>
            <Button
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={exportToExcel}
              disabled={loading || childrenList.length === 0}
            >
              <Download size={15} className="mr-2" />
              Excel export
            </Button>
          </div>
        }
      />

      <div className="bg-white dark:bg-[#1e2130] p-4 sm:p-5 rounded-2xl border border-white-border dark:border-gray-700/60 shadow-sm relative z-10 flex flex-col gap-4">
        <SearchBar
           value={search}
           onChange={setSearch}
           placeholder="Ad, soyad və ya telefon ilə axtar..."
           className="w-full max-w-md"
        />
      </div>

      {loading ? (
        <div className="bg-white dark:bg-[#1e2130] rounded-xl p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
      ) : processedChildren.length > 0 ? (
        <ChildTable
            rows={processedChildren}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            onDeleteBulk={handleBulkDelete}
        />
      ) : (
        <EmptyState
            icon={<Users />}
            title="Deaktiv uşaq tapılmadı"
            description="Hazırda deaktiv statuslu uşaq yoxdur."
        />
      )}
    </motion.div>
  );
}
