'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { paymentSchema, type PaymentFormValues } from '@/lib/utils/validators';
import { paymentsApi } from '@/lib/api/payments';
import { childrenApi } from '@/lib/api/children';
import { cashboxesApi } from '@/lib/api/cashboxes';
import { formatCurrency } from '@/lib/utils/format';
import { DollarSign, ReceiptText, Trash2, Search, X, ChevronDown, User } from 'lucide-react';
import type { Payment, Cashbox } from '@/types';

const MONTH_OPTIONS = [
  { value: '1', label: 'Yanvar' },  { value: '2', label: 'Fevral' },
  { value: '3', label: 'Mart'   },  { value: '4', label: 'Aprel'  },
  { value: '5', label: 'May'    },  { value: '6', label: 'İyun'   },
  { value: '7', label: 'İyul'   },  { value: '8', label: 'Avqust' },
  { value: '9', label: 'Sentyabr' }, { value: '10', label: 'Oktyabr' },
  { value: '11', label: 'Noyabr' }, { value: '12', label: 'Dekabr' },
];

interface ChildOption {
  value: string;
  label: string;
  searchKey: string;
}

function normalizeSearch(value: string) {
  return value
    .toLocaleLowerCase('az')
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(target: string, query: string) {
  const normalizedTarget = normalizeSearch(target);
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) return true;
  if (normalizedTarget.includes(normalizedQuery)) return true;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => normalizedTarget.includes(token))) {
    return true;
  }

  const compactTarget = normalizedTarget.replace(/\s+/g, '');
  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  let idx = 0;

  for (const ch of compactQuery) {
    idx = compactTarget.indexOf(ch, idx);
    if (idx === -1) return false;
    idx += 1;
  }

  return true;
}

interface PaymentFormProps {
  childId?: number;
  childName?: string;
  defaultAmount?: number;
  defaultMonth?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentForm({ childId, childName, defaultAmount, defaultMonth, onSuccess, onCancel }: PaymentFormProps) {
  const showChildSelector = !childId || childId === 0;
  const [childOptions, setChildOptions] = useState<ChildOption[]>([]);
  const [childMonthlyFeeById, setChildMonthlyFeeById] = useState<Record<number, number>>({});
  const [childrenLoading, setChildrenLoading] = useState(showChildSelector);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedChildLabel, setSelectedChildLabel] = useState('');
  const [childSearch, setChildSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const [currentChildMonthlyFee, setCurrentChildMonthlyFee] = useState(0);
  const [history, setHistory] = useState<Payment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cashboxes, setCashboxes] = useState<{ value: string; label: string }[]>([]);
  const [cashboxesLoading, setCashboxesLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [lastRecordedPaymentId, setLastRecordedPaymentId] = useState<number | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm<PaymentFormValues>({
    mode: 'onChange',
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      childId: childId && childId > 0 ? childId : 0,
      amount: defaultAmount,
      month: defaultMonth ?? (new Date().getMonth() + 1),
      year: new Date().getFullYear(),
      cashboxId: 0,
    },
  });

  useEffect(() => {
    if (childId && childId > 0) {
      setValue('childId', childId, { shouldValidate: false });
    }
  }, [childId, setValue]);

  useEffect(() => {
    cashboxesApi.getAll()
      .then((res) => {
        // filter mapped cashboxes
        const actCashboxes: Cashbox[] = res.filter((c) => c.isActive !== false);
        setCashboxes(
          actCashboxes.map((c) => ({
            value: String(c.id),
            label: `${c.name} (${c.type === 'Cash' ? 'Nağd' : c.type === 'Cashless' ? 'Pos Terminal' : c.type === 'CardAccount' ? 'Kart Hesabı' : c.type === 'DebitCard' ? 'Debet Kart' : 'Digər'})`,
          }))
        );
        if (actCashboxes.length > 0) {
           setValue('cashboxId', actCashboxes[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setCashboxesLoading(false));
  }, [setValue]);

  useEffect(() => {
    if (!showChildSelector) return;
    Promise.all([
      childrenApi.getAll({ status: 'Active', pageSize: 200 }),
      childrenApi.getAll({ status: 'Inactive', pageSize: 200 }),
    ])
      .then(([activeRes, inactiveRes]) => {
        const allChildren = Array.from(
          new Map([...activeRes.items, ...inactiveRes.items].map((child) => [child.id, child])).values()
        );

        setChildMonthlyFeeById(
          allChildren.reduce<Record<number, number>>((acc, child) => {
            acc[child.id] = child.monthlyFee;
            return acc;
          }, {})
        );

        setChildOptions(
          allChildren.map((c) => ({
            value: String(c.id),
            label: `${c.firstName} ${c.lastName} - ${c.groupName}${c.status === 'Inactive' ? ' (Deaktiv)' : ''}`,
            searchKey: `${c.firstName} ${c.lastName} ${c.lastName} ${c.firstName} ${c.groupName}`,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setChildrenLoading(false));
  }, [showChildSelector]);

  const watchedChildId = useWatch({ control, name: 'childId' });
  const watchedMonth = useWatch({ control, name: 'month' });
  const watchedYear = useWatch({ control, name: 'year' });
  const watchedAmount = useWatch({ control, name: 'amount' });

  const effectiveChildId =
    typeof watchedChildId === 'number' && watchedChildId > 0
      ? watchedChildId
      : childId && childId > 0
        ? childId
        : 0;

  useEffect(() => {
    if (!effectiveChildId) return;

    let active = true;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const data = await paymentsApi.getChildHistory(effectiveChildId);
        if (active) setHistory(data);
      } catch {
        if (active) setHistory([]);
      } finally {
        if (active) setHistoryLoading(false);
      }
    };

    void loadHistory();
    return () => {
      active = false;
    };
  }, [effectiveChildId]);

  useEffect(() => {
    if (!effectiveChildId) {
      setCurrentChildMonthlyFee(0);
      return;
    }

    let active = true;

    const loadChildFee = async () => {
      try {
        const detail = await childrenApi.getById(effectiveChildId);
        if (active) setCurrentChildMonthlyFee(detail.monthlyFee ?? 0);
      } catch {
        if (active) setCurrentChildMonthlyFee(0);
      }
    };

    void loadChildFee();
    return () => {
      active = false;
    };
  }, [effectiveChildId]);

  const currentPayment = history.find((p) => p.month === watchedMonth && p.year === watchedYear);
  const paidBefore = currentPayment?.paidAmount ?? 0;
  const remainingBefore = currentPayment?.remainingDebt ?? 0;
  const monthTotal = currentPayment?.finalAmount ?? currentPayment?.originalAmount ?? 0;

  useEffect(() => {
    // If there is an existing monthly record, prefill with that month's total amount.
    if (!currentPayment) return;

    const suggestedAmount = currentPayment.finalAmount > 0
      ? currentPayment.finalAmount
      : currentPayment.originalAmount > 0
        ? currentPayment.originalAmount
        : currentPayment.remainingDebt;

    if (suggestedAmount <= 0) return;
    setValue('amount', suggestedAmount, {
      shouldValidate: true,
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [currentPayment, setValue]);

  useEffect(() => {
    // When there is no record for the selected month, prefill with child's monthly fee.
    if (!effectiveChildId || currentPayment || currentChildMonthlyFee <= 0) return;

    setValue('amount', currentChildMonthlyFee, {
      shouldValidate: true,
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [effectiveChildId, currentPayment, currentChildMonthlyFee, setValue]);

  const plannedAmount = typeof watchedAmount === 'number' && Number.isFinite(watchedAmount) ? watchedAmount : 0;
  const remainingAfter = currentPayment ? Math.max(0, remainingBefore - plannedAmount) : null;
  const overpayAmount = currentPayment ? Math.max(0, plannedAmount - remainingBefore) : 0;

  const filteredChildOptions = useMemo(() => {
    if (!childSearch.trim()) {
      return childOptions;
    }
    return childOptions.filter((option) => fuzzyMatch(option.searchKey, childSearch));
  }, [childOptions, childSearch]);

  const childSelectOptions = useMemo(() => {
    return filteredChildOptions.map((option) => ({ value: option.value, label: option.label }));
  }, [filteredChildOptions]);

  const onSubmit = async (data: PaymentFormValues) => {
    try {
      const recorded = await paymentsApi.record(data);
      setLastRecordedPaymentId(recorded.id);
      toast.success('Ödəniş uğurla qeyd edildi');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xəta baş verdi';
      toast.error(message);
    }
  };

  const handleDeletePayment = async () => {
    if (!currentPayment) return;

    setDeleteLoading(true);
    try {
      await paymentsApi.delete(currentPayment.id);
      toast.success('Ödəniş silindi');
      setHistory((prev) => prev.filter((p) => p.id !== currentPayment.id));
      setDeleteOpen(false);
      onSuccess?.();
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : '';
      const normalized = rawMessage.toLowerCase();

      if (
        normalized.includes('404') ||
        normalized.includes('not found') ||
        normalized.includes('tapılmadı')
      ) {
        toast.error('Ödəniş tapılmadı');
      } else if (
        normalized.includes('401') ||
        normalized.includes('403') ||
        normalized.includes('unauthorized') ||
        normalized.includes('forbidden') ||
        normalized.includes('səlahiyyət')
      ) {
        toast.error('Səlahiyyət yoxdur');
      } else {
        toast.error(rawMessage || 'Ödəniş silinmədi');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleShowReceipt = async (paymentId: number) => {
    setReceiptLoading(true);
    try {
      const receipt = await paymentsApi.downloadReceipt(paymentId);
      const receiptUrl = URL.createObjectURL(receipt.blob);
      const opened = window.open(receiptUrl, '_blank', 'noopener,noreferrer');

      if (!opened) {
        const a = document.createElement('a');
        a.href = receiptUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }

      window.setTimeout(() => URL.revokeObjectURL(receiptUrl), 300000);
    } catch {
      toast.error('Çek yüklənmədi');
    } finally {
      setReceiptLoading(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!showChildSelector && childName && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Bu ödəniş <span className="font-semibold">{childName}</span> üçün qeyd ediləcək.
        </div>
      )}
      {showChildSelector && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Uşaq <span className="text-accent-rose">*</span>
          </label>

          {/* Selected child card */}
          {selectedChildId && selectedChildLabel ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {selectedChildLabel.split(' - ')[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {selectedChildLabel.split(' - ').slice(1).join(' - ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedChildId('');
                  setSelectedChildLabel('');
                  setChildSearch('');
                  setValue('childId', 0, { shouldValidate: false });
                }}
                className="rounded-full p-1 text-gray-400 hover:bg-rose-50 hover:text-accent-rose transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            /* Combobox */
            <div ref={comboboxRef} className="relative">
              <div
                className={`flex items-center gap-2 rounded-xl border bg-white dark:bg-[#1e2130] px-3 py-2.5 transition-all ${
                  dropdownOpen
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-white-border dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => { if (!childrenLoading) setDropdownOpen(true); }}
              >
                <Search size={15} className="shrink-0 text-gray-400" />
                <input
                  type="text"
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none"
                  placeholder={childrenLoading ? 'Yüklənir...' : 'Adı və ya soyadı yazın...'}
                  value={childSearch}
                  disabled={childrenLoading}
                  onChange={(e) => {
                    setChildSearch(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => { if (!childrenLoading) setDropdownOpen(true); }}
                />
                {childSearch ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setChildSearch(''); }}
                    className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </div>

              {/* Dropdown list */}
              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] shadow-lg overflow-hidden">
                  {childSelectOptions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">
                      {childrenLoading ? 'Yüklənir...' : 'Uşaq tapılmadı'}
                    </div>
                  ) : (
                    <ul className="max-h-52 overflow-y-auto py-1">
                      {childSelectOptions.map((opt) => {
                        const parts = opt.label.split(' - ');
                        const name = parts[0];
                        const group = parts.slice(1).join(' - ');
                        const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <li key={opt.value}>
                            <button
                              type="button"
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                const val = opt.value;
                                const numericChildId = Number(val);
                                setSelectedChildId(val);
                                setSelectedChildLabel(opt.label);
                                setChildSearch('');
                                setDropdownOpen(false);
                                setValue('childId', numericChildId, { shouldValidate: true });
                                const monthlyFee = childMonthlyFeeById[numericChildId];
                                if (typeof monthlyFee === 'number' && Number.isFinite(monthlyFee) && monthlyFee > 0) {
                                  setValue('amount', monthlyFee, { shouldValidate: true, shouldDirty: false, shouldTouch: false });
                                }
                              }}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{name}</p>
                                {group && <p className="text-xs text-gray-400 truncate">{group}</p>}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {errors.childId && (
            <p className="text-xs text-accent-rose">⚠ {errors.childId.message}</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Select
          {...register('month', { valueAsNumber: true })}
          label="Ay *"
          options={MONTH_OPTIONS}
          error={errors.month?.message}
        />
        <Input
          {...register('year', { valueAsNumber: true })}
          label="İl *"
          type="number"
          placeholder="2025"
          error={errors.year?.message}
        />
      </div>

      <div className="rounded-xl border border-white-border dark:border-gray-700/60 bg-gray-50/60 dark:bg-[#252836] p-3 space-y-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Seçilən ay üzrə vəziyyət</p>

        {!effectiveChildId ? (
          <p className="text-xs text-gray-400">Məlumatı görmək üçün əvvəlcə uşaq seçin.</p>
        ) : historyLoading ? (
          <p className="text-xs text-gray-400">Yüklənir...</p>
        ) : !currentPayment ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">Bu ay üçün ödəniş qeydi tapılmadı.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 p-2">
                <p className="text-gray-400">Aylıq məbləğ</p>
                <p className="font-semibold text-gray-700 dark:text-gray-200 mt-1">{formatCurrency(monthTotal)}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 p-2">
                <p className="text-gray-400">İndiyə qədər ödənilib</p>
                <p className="font-semibold text-green-600 mt-1">{formatCurrency(paidBefore)}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 p-2">
                <p className="text-gray-400">Qalıq borc</p>
                <p className="font-semibold text-accent-rose mt-1">{formatCurrency(remainingBefore)}</p>
              </div>
            </div>

            {plannedAmount > 0 && remainingAfter !== null && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                Bu ödənişdən sonra qalıq: <span className="font-semibold">{formatCurrency(remainingAfter)}</span>
                {overpayAmount > 0 && (
                  <span className="text-amber-600 dark:text-amber-400"> (Artıq ödəniş: {formatCurrency(overpayAmount)})</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Məbləğ (₼) *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₼</span>
          <input
            {...register('amount', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full h-10 pl-8 pr-4 text-sm border border-white-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="300.00"
            min={0.01}
          />
        </div>
        {errors.amount && <p className="mt-1 text-xs text-accent-rose">⚠ {errors.amount.message}</p>}
      </div>
      <Select
        {...register('cashboxId', { valueAsNumber: true })}
        label="Kassa *"
        options={cashboxes}
        disabled={cashboxesLoading}
        error={errors.cashboxId?.message}
      />
      <Input {...register('notes')} label="Qeyd (opsional)" placeholder="Əlave məlumat..." />
      {currentPayment && currentPayment.paidAmount > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
          <p className="text-xs text-rose-700 mb-2">Bu ay üçün mövcud ödəniş qeydi üçün çeki görə və silə bilərsiniz.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={receiptLoading}
              onClick={() => handleShowReceipt(currentPayment.id)}
            >
              <ReceiptText size={13} /> Bu ödənişi göstər
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={13} /> Bu ayın ödənişini sil
            </Button>
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => lastRecordedPaymentId ? onSuccess?.() : onCancel?.()}
        >
          {lastRecordedPaymentId ? 'Bağla' : 'Ləğv et'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!lastRecordedPaymentId}
          loading={receiptLoading}
          onClick={() => lastRecordedPaymentId && handleShowReceipt(lastRecordedPaymentId)}
        >
          <ReceiptText size={14} /> Çeki göstər
        </Button>
        <Button type="submit" className="flex-1" loading={isSubmitting} disabled={!!lastRecordedPaymentId}>
          <DollarSign size={14} /> Qeyd et
        </Button>
      </div>
    </form>

    <Modal open={deleteOpen} onOpenChange={(open) => { if (!deleteLoading) setDeleteOpen(open); }}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Ödənişi sil</ModalTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Seçilən ay üçün qeyd olunmuş ödəniş silinəcək. Bu əməliyyat geri alına bilməz.
          </p>
        </ModalHeader>
        {currentPayment && (
          <div className="rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2 text-sm text-gray-700 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-gray-200">
            <p><span className="font-medium">Ödənilib:</span> {formatCurrency(currentPayment.paidAmount)}</p>
            <p><span className="font-medium">Qalıq:</span> {formatCurrency(currentPayment.remainingDebt)}</p>
          </div>
        )}
        <ModalFooter>
          <Button type="button" variant="secondary" size="sm" disabled={deleteLoading} onClick={() => setDeleteOpen(false)}>
            Ləğv et
          </Button>
          <Button type="button" variant="danger" size="sm" loading={deleteLoading} onClick={handleDeletePayment}>
            <Trash2 size={14} /> Sil
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  );
}
