'use client';
import { useState, useEffect } from 'react';
import { Plus, Wallet, Search } from 'lucide-react';
import { useAuthStore, getPermissions } from '@/lib/stores/authStore';
import { cashboxesApi } from '@/lib/api/cashboxes';
import type { Cashbox } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { CashboxesTable } from '@/components/cashboxes/CashboxesTable';
import { CashboxForm } from '@/components/cashboxes/CashboxForm';
import { useRouter } from 'next/navigation';

export default function CashboxesPage() {
  const { user } = useAuthStore();
  const perms = getPermissions(user?.role);
  const router = useRouter();

  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCashbox, setSelectedCashbox] = useState<Cashbox | undefined>(undefined);

  if (!perms.cashboxes.view) {
    if (typeof window !== 'undefined') router.replace('/');
    return null;
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await cashboxesApi.getAll();
      setCashboxes(data);
    } catch (error) {
      console.error('Failed to load cashboxes', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenForm = (cashbox?: Cashbox) => {
    setSelectedCashbox(cashbox);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedCashbox(undefined);
    setIsFormOpen(false);
  };

  const filteredCashboxes = cashboxes.filter(cb => 
    cb.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Kassalar" 
        description="Məktəbəqədər müəssisənin kassa və bank hesablarının idarə edilməsi"
        actions={
          perms.cashboxes.create && (
            <Button onClick={() => handleOpenForm()} className="gap-2">
              <Plus size={18} />
              Yenisini Yarat
            </Button>
          )
        }
      />

      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-white-border dark:border-gray-700/60 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Kassa adını axtar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : filteredCashboxes.length === 0 ? (
          <EmptyState
            icon={<Wallet size={28} />}
            title="Kassa tapılmadı"
            description={search ? 'Axtarışınıza uyğun kassa tapılmadı.' : 'Sistemdə heç bir kassa mövcud deyil.'}
            action={perms.cashboxes.create ? {
              label: 'Yeni Kassa Yarat',
              onClick: () => handleOpenForm()
            } : undefined}
          />
        ) : (
          <CashboxesTable
            data={filteredCashboxes}
            onEdit={perms.cashboxes.edit ? handleOpenForm : undefined}
            onToggleStatus={async (id, isActive) => {
              await cashboxesApi.toggleStatus(id, isActive);
              loadData();
            }}
            canEdit={!!perms.cashboxes.edit}
          />
        )}
      </div>

      <CashboxForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        cashbox={selectedCashbox}
        onSuccess={() => {
          handleCloseForm();
          loadData();
        }}
      />
    </div>
  );
}