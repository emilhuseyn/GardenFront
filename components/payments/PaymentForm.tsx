'use client';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { paymentSchema, type PaymentFormValues } from '@/lib/utils/validators';
import { paymentsApi } from '@/lib/api/payments';
import { childrenApi } from '@/lib/api/children';
import { formatCurrency } from '@/lib/utils/format';
import { DollarSign } from 'lucide-react';
import type { Payment } from '@/types';

const MONTH_OPTIONS = [
  { value: '1', label: 'Yanvar' },  { value: '2', label: 'Fevral' },
  { value: '3', label: 'Mart'   },  { value: '4', label: 'Aprel'  },
  { value: '5', label: 'May'    },  { value: '6', label: 'İyun'   },
  { value: '7', label: 'İyul'   },  { value: '8', label: 'Avqust' },
  { value: '9', label: 'Sentyabr' }, { value: '10', label: 'Oktyabr' },
  { value: '11', label: 'Noyabr' }, { value: '12', label: 'Dekabr' },
];

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
  const [childOptions, setChildOptions] = useState<{ value: string; label: string }[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(showChildSelector);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [history, setHistory] = useState<Payment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm<PaymentFormValues>({
    mode: 'onChange',
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      childId: childId && childId > 0 ? childId : 0,
      amount: defaultAmount,
      month: defaultMonth ?? (new Date().getMonth() + 1),
      year: new Date().getFullYear(),
    },
  });

  useEffect(() => {
    if (childId && childId > 0) {
      setValue('childId', childId, { shouldValidate: false });
    }
  }, [childId, setValue]);

  useEffect(() => {
    if (!showChildSelector) return;
    childrenApi.getAll({ status: 'Active', pageSize: 200 })
      .then((res) => {
        setChildOptions(
          res.items.map((c) => ({
            value: String(c.id),
            label: `${c.firstName} ${c.lastName} - ${c.groupName}`,
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

  const currentPayment = history.find((p) => p.month === watchedMonth && p.year === watchedYear);
  const paidBefore = currentPayment?.paidAmount ?? 0;
  const remainingBefore = currentPayment?.remainingDebt ?? 0;
  const monthTotal = currentPayment?.finalAmount ?? currentPayment?.originalAmount ?? 0;

  const plannedAmount = typeof watchedAmount === 'number' && Number.isFinite(watchedAmount) ? watchedAmount : 0;
  const remainingAfter = currentPayment ? Math.max(0, remainingBefore - plannedAmount) : null;
  const overpayAmount = currentPayment ? Math.max(0, plannedAmount - remainingBefore) : 0;

  const onSubmit = async (data: PaymentFormValues) => {
    try {
      await paymentsApi.record(data);
      toast.success('Ödəniş uğurla qeyd edildi');
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xəta baş verdi';
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!showChildSelector && childName && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Bu ödəniş <span className="font-semibold">{childName}</span> üçün qeyd ediləcək.
        </div>
      )}
      {showChildSelector && (
        <Select
          label="Uşaq *"
          placeholder={childrenLoading ? 'Yüklənir...' : 'Uşaq seçin...'}
          options={childOptions}
          disabled={childrenLoading}
          value={selectedChildId}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedChildId(val);
            setValue('childId', Number(val), { shouldValidate: true });
          }}
          error={errors.childId?.message}
        />
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
      <Input {...register('notes')} label="Qeyd (opsional)" placeholder="Əlave məlumat..." />
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Ləğv et
        </Button>
        <Button type="submit" className="flex-1" loading={isSubmitting}>
          <DollarSign size={14} /> Qeyd et
        </Button>
      </div>
    </form>
  );
}
