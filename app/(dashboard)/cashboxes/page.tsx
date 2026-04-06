'use client';
import { useState, useEffect } from 'react';
import { Plus, Wallet, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore, getPermissions } from '@/lib/stores/authStore';
import { cashboxesApi } from '@/lib/api/cashboxes';
import type { Cashbox, CashboxMonthlyBalance } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { CashboxesTable } from '@/components/cashboxes/CashboxesTable';
import { CashboxForm } from '@/components/cashboxes/CashboxForm';
import { useRouter } from 'next/navigation';
import { AZ_MONTHS, formatCurrency, formatMonthYear } from '@/lib/utils/format';

export default function CashboxesPage() {
  const { user } = useAuthStore();
  const perms = getPermissions(user?.role);
  const router = useRouter();

  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCashbox, setSelectedCashbox] = useState<Cashbox | undefined>(undefined);
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [balanceCashbox, setBalanceCashbox] = useState<Cashbox | null>(null);
  const [balanceMonth, setBalanceMonth] = useState(new Date().getMonth() + 1);
  const [balanceYear, setBalanceYear] = useState(new Date().getFullYear());
  const [openingBalanceInput, setOpeningBalanceInput] = useState('0');
  const [monthlyBalance, setMonthlyBalance] = useState<CashboxMonthlyBalance | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<CashboxMonthlyBalance[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [balanceSaving, setBalanceSaving] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

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
    if (!perms.cashboxes.view) {
      router.replace('/');
      return;
    }
    void loadData();
  }, [perms.cashboxes.view, router]);

  const handleOpenForm = (cashbox?: Cashbox) => {
    setSelectedCashbox(cashbox);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setSelectedCashbox(undefined);
    setIsFormOpen(false);
  };

  const handleOpenBalance = (cashbox: Cashbox) => {
    setBalanceCashbox(cashbox);
    setBalanceMonth(new Date().getMonth() + 1);
    setBalanceYear(new Date().getFullYear());
    setOpeningBalanceInput('0');
    setMonthlyBalance(null);
    setBalanceError(null);
    setIsBalanceOpen(true);
  };

  useEffect(() => {
    if (!isBalanceOpen || !balanceCashbox) return;

    let active = true;
    setHistoryLoading(true);

    cashboxesApi.getBalanceHistory(balanceCashbox.id)
      .then((history) => {
        if (!active) return;
        const sorted = [...history].sort((a, b) => {
          const av = a.year * 100 + a.month;
          const bv = b.year * 100 + b.month;
          return bv - av;
        });
        setBalanceHistory(sorted);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Tarixçə yüklənmədi';
        setBalanceError(message);
        setBalanceHistory([]);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isBalanceOpen, balanceCashbox]);

  useEffect(() => {
    if (!isBalanceOpen || !balanceCashbox) return;

    let active = true;
    setMonthlyLoading(true);

    cashboxesApi.getMonthlyBalance(balanceCashbox.id, balanceMonth, balanceYear)
      .then((data) => {
        if (!active) return;
        setMonthlyBalance(data);
        setOpeningBalanceInput(String(data.openingBalance ?? 0));
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Aylıq balans yüklənmədi';
        setBalanceError(message);
        setMonthlyBalance(null);
      })
      .finally(() => {
        if (active) setMonthlyLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isBalanceOpen, balanceCashbox, balanceMonth, balanceYear]);

  const handleSaveOpeningBalance = async () => {
    if (!balanceCashbox) return;

    const parsed = Number(openingBalanceInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setBalanceError('Açılış qalığını düzgün daxil edin.');
      return;
    }

    try {
      setBalanceSaving(true);
      setBalanceError(null);

      await cashboxesApi.setOpeningBalance(balanceCashbox.id, {
        month: balanceMonth,
        year: balanceYear,
        openingBalance: parsed,
      });

      const [monthly, history] = await Promise.all([
        cashboxesApi.getMonthlyBalance(balanceCashbox.id, balanceMonth, balanceYear),
        cashboxesApi.getBalanceHistory(balanceCashbox.id),
      ]);

      setMonthlyBalance(monthly);
      setOpeningBalanceInput(String(monthly.openingBalance ?? 0));
      setBalanceHistory(
        [...history].sort((a, b) => {
          const av = a.year * 100 + a.month;
          const bv = b.year * 100 + b.month;
          return bv - av;
        })
      );

      await loadData();
      toast.success('Açılış qalığı yadda saxlanıldı');
    } catch (err: unknown) {
      setBalanceError(err instanceof Error ? err.message : 'Açılış qalığı yadda saxlanmadı');
    } finally {
      setBalanceSaving(false);
    }
  };

  const filteredCashboxes = cashboxes.filter(cb => 
    cb.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!perms.cashboxes.view) {
    return null;
  }

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
            onManageBalance={perms.cashboxes.edit ? handleOpenBalance : undefined}
            onToggleStatus={async (id, isActive) => {
              await cashboxesApi.update(id, { isActive });
              await loadData();
            }}
            canEdit={!!perms.cashboxes.edit}
          />
        )}
      </div>

      <Modal open={isBalanceOpen} onOpenChange={(open) => !open && setIsBalanceOpen(false)}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>
              Balans idarəetməsi{balanceCashbox ? `: ${balanceCashbox.name}` : ''}
            </ModalTitle>
          </ModalHeader>

          <div className="space-y-4">
            {balanceError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 dark:text-red-400 rounded-lg">
                {balanceError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                value={String(balanceMonth)}
                onChange={(e) => setBalanceMonth(Number(e.target.value))}
                options={AZ_MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
                label="Ay"
              />
              <Input
                type="number"
                label="İl"
                value={String(balanceYear)}
                onChange={(e) => setBalanceYear(Number(e.target.value) || new Date().getFullYear())}
              />
              <Input
                type="number"
                label="Açılış qalığı"
                value={openingBalanceInput}
                onChange={(e) => setOpeningBalanceInput(e.target.value)}
                min={0}
                step="0.01"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 p-3 bg-gray-50/60 dark:bg-gray-800/40">
                <p className="text-xs text-gray-500">Açılış qalığı</p>
                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {monthlyLoading ? '...' : formatCurrency(monthlyBalance?.openingBalance ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 p-3 bg-gray-50/60 dark:bg-gray-800/40">
                <p className="text-xs text-gray-500">Aylıq gəlir</p>
                <p className="mt-1 text-sm font-semibold text-green-600 dark:text-green-400">
                  {monthlyLoading ? '...' : formatCurrency(monthlyBalance?.monthlyIncome ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 p-3 bg-gray-50/60 dark:bg-gray-800/40">
                <p className="text-xs text-gray-500">Cəm balans</p>
                <p className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {monthlyLoading ? '...' : formatCurrency(monthlyBalance?.totalBalance ?? 0)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700/50">
                <p className="text-xs font-semibold text-gray-500">Balans tarixçəsi</p>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {historyLoading ? (
                  <p className="px-3 py-4 text-sm text-gray-400">Yüklənir...</p>
                ) : balanceHistory.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-gray-400">Tarixçə tapılmadı</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700/50">
                        <th className="px-3 py-2">Ay</th>
                        <th className="px-3 py-2">Açılış</th>
                        <th className="px-3 py-2">Gəlir</th>
                        <th className="px-3 py-2">Cəm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceHistory.map((item) => (
                        <tr key={`${item.year}-${item.month}`} className="border-b border-gray-100 dark:border-gray-700/40 last:border-none">
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatMonthYear(item.month, item.year)}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatCurrency(item.openingBalance)}</td>
                          <td className="px-3 py-2 text-green-600 dark:text-green-400">{formatCurrency(item.monthlyIncome)}</td>
                          <td className="px-3 py-2 font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(item.totalBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsBalanceOpen(false)} disabled={balanceSaving}>
              Bağla
            </Button>
            <Button onClick={handleSaveOpeningBalance} loading={balanceSaving}>
              Açılış qalığını yadda saxla
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

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