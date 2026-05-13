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
import { DollarSign, ReceiptText, Trash2, Search, X, ChevronDown, User, Check, CalendarDays, Layers, ArrowDownToLine, Info } from 'lucide-react';
import { cn } from '@/lib/utils/constants';
import type { Payment, Cashbox, ChildStatus } from '@/types';

type BulkMonthStatus = 'paid' | 'partial' | 'unpaid' | 'new' | 'free';

interface BulkMonthState {
  status: BulkMonthStatus;
  amountDue: number;
  paidSoFar: number;
  finalAmount: number;
}

const BULK_MONTH_STYLES: Record<BulkMonthStatus, { bg: string; icon: string; label: string; textColor: string; ringColor: string }> = {
  paid:    { bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40',     icon: '✓', label: 'Ödənildi',    textColor: 'text-green-700 dark:text-green-400',   ringColor: 'ring-green-400'  },
  partial: { bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40',     icon: '½', label: 'Yarımçıq',    textColor: 'text-amber-700 dark:text-amber-400',   ringColor: 'ring-amber-400'  },
  unpaid:  { bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40',         icon: '✕', label: 'Borc',        textColor: 'text-rose-700 dark:text-rose-400',     ringColor: 'ring-rose-400'   },
  new:     { bg: 'bg-white dark:bg-[#1e2130] border-gray-200 dark:border-gray-700/60',             icon: '·', label: 'Yeni',        textColor: 'text-gray-500 dark:text-gray-400',     ringColor: 'ring-primary'    },
  free:    { bg: 'bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700/60',        icon: '–', label: 'Ödənişsiz',   textColor: 'text-gray-400 dark:text-gray-500',     ringColor: 'ring-gray-400'   },
};

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
  const [childDiscountById, setChildDiscountById] = useState<Record<number, number>>({});
  const [childrenLoading, setChildrenLoading] = useState(showChildSelector);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedChildLabel, setSelectedChildLabel] = useState('');
  const [childSearch, setChildSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const [currentChildMonthlyFee, setCurrentChildMonthlyFee] = useState(0);
  const [currentChildRawMonthlyFee, setCurrentChildRawMonthlyFee] = useState(0);
  const [currentChildDiscount, setCurrentChildDiscount] = useState(0);
  const [currentChildStatus, setCurrentChildStatus] = useState<ChildStatus | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [cashboxes, setCashboxes] = useState<{ value: string; label: string }[]>([]);
  const [cashboxesLoading, setCashboxesLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [lastRecordedPaymentId, setLastRecordedPaymentId] = useState<number | null>(null);

  // Multi-month ödəniş rejimi
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkYear, setBulkYear] = useState<number>(new Date().getFullYear());
  const [bulkSelectedMonths, setBulkSelectedMonths] = useState<Set<number>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Admin "Yuvarlaqlaşdır" courtesy discount tracking
  // When admin clicks the button we remember the original + rounded value so we can
  // compute the discount and detect if the admin manually overrides the amount.
  const [roundingState, setRoundingState] = useState<{ original: number; rounded: number } | null>(null);

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
    let active = true;
    setChildrenLoading(true);

    const fetchChildrenByStatus = async (status: 'Active' | 'Inactive') => {
      // Backend supports pageSize <= 0 to return all filtered rows at once.
      const allAtOnce = await childrenApi.getAll({ status, pageSize: 0 }, { silentError: true });
      const totalPages = Math.max(allAtOnce.totalPages || 1, 1);

      if (!allAtOnce.hasNextPage && totalPages <= 1) {
        return allAtOnce.items;
      }

      // Fallback when backend still paginates despite pageSize 0.
      const pageSize = 200;
      const firstPage = await childrenApi.getAll({ status, page: 1, pageSize }, { silentError: true });
      let allItems = [...firstPage.items];
      const fallbackTotalPages = Math.max(firstPage.totalPages || 1, 1);

      if (firstPage.hasNextPage || fallbackTotalPages > 1) {
        for (let page = 2; page <= fallbackTotalPages; page += 1) {
          const nextPage = await childrenApi.getAll({ status, page, pageSize }, { silentError: true });
          allItems = allItems.concat(nextPage.items);
        }
      }

      return allItems;
    };

    const run = async () => {
      try {
        const [activeChildren, inactiveChildren] = await Promise.all([
          fetchChildrenByStatus('Active'),
          fetchChildrenByStatus('Inactive'),
        ]);

        if (!active) return;

        const allChildren = Array.from(
          new Map([...activeChildren, ...inactiveChildren].map((child) => [child.id, child])).values()
        );

        setChildMonthlyFeeById(
          allChildren.reduce<Record<number, number>>((acc, child) => {
            const fee = child.monthlyFee;
            const discount = child.discountPercentage ?? 0;
            acc[child.id] = discount > 0 ? fee - (fee * discount) / 100 : fee;
            return acc;
          }, {})
        );

        setChildDiscountById(
          allChildren.reduce<Record<number, number>>((acc, child) => {
            acc[child.id] = child.discountPercentage ?? 0;
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
      } catch {
        if (active) {
          setChildOptions([]);
          setChildMonthlyFeeById({});
          setChildDiscountById({});
        }
      } finally {
        if (active) setChildrenLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [showChildSelector]);

  const watchedChildId = useWatch({ control, name: 'childId' });
  const watchedMonth = useWatch({ control, name: 'month' });
  const watchedYear = useWatch({ control, name: 'year' });
  const watchedAmount = useWatch({ control, name: 'amount' });
  const watchedCashboxId = useWatch({ control, name: 'cashboxId' });
  const watchedNotes = useWatch({ control, name: 'notes' });

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
      setCurrentChildDiscount(0);
      setCurrentChildStatus(null);
      return;
    }

    let active = true;

    const loadChildFee = async () => {
      try {
        const detail = await childrenApi.getById(effectiveChildId);
        if (active) {
          const fee = detail.monthlyFee ?? 0;
          const discount = detail.discountPercentage ?? 0;
          setCurrentChildRawMonthlyFee(fee);
          setCurrentChildMonthlyFee(discount > 0 ? fee - (fee * discount) / 100 : fee);
          setCurrentChildDiscount(discount);
          setCurrentChildStatus(detail.status ?? null);
        }
      } catch {
        if (active) {
          setCurrentChildMonthlyFee(0);
          setCurrentChildRawMonthlyFee(0);
          setCurrentChildDiscount(0);
          setCurrentChildStatus(null);
        }
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

  // Detect pro-rated period info stored in Notes: "Dövr: {startDay}-{endDay} ({daysActive} gün)"
  // Backend writes this whenever a payment was billed for a partial month (mid-month entry or exit).
  const periodInfo = useMemo(() => {
    const notes = currentPayment?.notes;
    if (!notes) return null;
    const match = notes.match(/Dövr:\s*(\d+)\s*-\s*(\d+)\s*\(\s*(\d+)\s*gün\s*\)/i);
    if (!match) return null;
    return {
      startDay: Number(match[1]),
      endDay: Number(match[2]),
      daysActive: Number(match[3]),
    };
  }, [currentPayment?.notes]);

  const monthLabel = useMemo(() => {
    const m = typeof watchedMonth === 'number' ? watchedMonth : 0;
    return MONTH_OPTIONS[m - 1]?.label ?? '';
  }, [watchedMonth]);

  const daysInMonthCount = useMemo(() => {
    const y = typeof watchedYear === 'number' ? watchedYear : new Date().getFullYear();
    const m = typeof watchedMonth === 'number' ? watchedMonth : 1;
    return new Date(y, m, 0).getDate();
  }, [watchedMonth, watchedYear]);

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

  useEffect(() => {
    // Re-enable submit when user switches child or period for a new payment.
    setLastRecordedPaymentId(null);
  }, [effectiveChildId, watchedMonth, watchedYear]);

  // Reset rounding state when context changes
  useEffect(() => {
    setRoundingState(null);
  }, [effectiveChildId, watchedMonth, watchedYear, mode]);

  // Active rounding discount: only applies as long as the form amount equals the rounded value
  const effectiveRoundingDiscount = useMemo(() => {
    if (!roundingState) return 0;
    if (typeof watchedAmount !== 'number' || !Number.isFinite(watchedAmount)) return 0;
    if (watchedAmount !== roundingState.rounded) return 0;
    return Math.max(0, roundingState.original - roundingState.rounded);
  }, [roundingState, watchedAmount]);

  // The rounding courtesy is only meaningful for deactivated children — their pro-rated
  // amounts (e.g. 203 ₼ for a partial month) are the ones admins typically forgive down
  // to nice round numbers. Active children pay normal monthly fees and don't need this.
  const canRoundDown = useMemo(() => {
    if (currentChildStatus !== 'Inactive') return false;
    const amt = typeof watchedAmount === 'number' && Number.isFinite(watchedAmount) ? watchedAmount : 0;
    if (amt <= 10) return false;
    const rounded = Math.floor(amt / 10) * 10;
    return rounded > 0 && rounded < amt;
  }, [watchedAmount, currentChildStatus]);

  const handleRoundDown = () => {
    const amt = typeof watchedAmount === 'number' && Number.isFinite(watchedAmount) ? watchedAmount : 0;
    const rounded = Math.floor(amt / 10) * 10;
    if (rounded <= 0 || rounded >= amt) return;
    setValue('amount', rounded, { shouldValidate: true, shouldDirty: false, shouldTouch: false });
    setRoundingState({ original: amt, rounded });
  };

  const handleClearRounding = () => {
    if (!roundingState) return;
    setValue('amount', roundingState.original, { shouldValidate: true, shouldDirty: false, shouldTouch: false });
    setRoundingState(null);
  };

  // Bulk: il dəyişəndə və ya uşaq dəyişəndə seçilmiş ayları sıfırla
  useEffect(() => {
    setBulkSelectedMonths(new Set());
  }, [bulkYear, effectiveChildId, mode]);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
    return years.map((y) => ({ value: String(y), label: String(y) }));
  }, [currentYear]);

  const bulkMonthsState = useMemo<Record<number, BulkMonthState>>(() => {
    const map: Record<number, BulkMonthState> = {};
    const isFreeChild = currentChildDiscount === 100;
    const fallbackFee = currentChildMonthlyFee > 0 ? currentChildMonthlyFee : 0;

    for (let m = 1; m <= 12; m += 1) {
      const p = history.find((x) => x.month === m && x.year === bulkYear);
      if (p) {
        const finalAmt = p.finalAmount ?? 0;
        const paid = p.paidAmount ?? 0;
        const remaining = p.remainingDebt ?? Math.max(0, finalAmt - paid);

        if (isFreeChild || finalAmt <= 0) {
          map[m] = { status: 'free', amountDue: 0, paidSoFar: paid, finalAmount: finalAmt };
        } else if (remaining <= 0) {
          map[m] = { status: 'paid', amountDue: 0, paidSoFar: paid, finalAmount: finalAmt };
        } else if (paid > 0) {
          map[m] = { status: 'partial', amountDue: remaining, paidSoFar: paid, finalAmount: finalAmt };
        } else {
          map[m] = { status: 'unpaid', amountDue: finalAmt, paidSoFar: 0, finalAmount: finalAmt };
        }
      } else {
        map[m] = {
          status: isFreeChild ? 'free' : 'new',
          amountDue: isFreeChild ? 0 : fallbackFee,
          paidSoFar: 0,
          finalAmount: isFreeChild ? 0 : fallbackFee,
        };
      }
    }
    return map;
  }, [history, bulkYear, currentChildMonthlyFee, currentChildDiscount]);

  const bulkTotal = useMemo(() => {
    let total = 0;
    bulkSelectedMonths.forEach((m) => {
      total += bulkMonthsState[m]?.amountDue ?? 0;
    });
    return total;
  }, [bulkSelectedMonths, bulkMonthsState]);

  const bulkAvailableMonths = useMemo(() => {
    return Object.entries(bulkMonthsState)
      .filter(([, s]) => s.status !== 'paid' && s.status !== 'free')
      .map(([k]) => Number(k));
  }, [bulkMonthsState]);

  const toggleBulkMonth = (m: number) => {
    const state = bulkMonthsState[m];
    if (!state) return;
    if (state.status === 'paid' || state.status === 'free') return;
    setBulkSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const selectAllBulkMonths = () => {
    setBulkSelectedMonths(new Set(bulkAvailableMonths));
  };

  const clearBulkSelection = () => {
    setBulkSelectedMonths(new Set());
  };

  const handleBulkSubmit = async () => {
    if (!effectiveChildId) {
      toast.error('Əvvəlcə uşaq seçin');
      return;
    }
    if (bulkSelectedMonths.size === 0) {
      toast.error('Ən azı bir ay seçin');
      return;
    }
    const cashboxIdNum = typeof watchedCashboxId === 'number' ? watchedCashboxId : Number(watchedCashboxId);
    if (!cashboxIdNum || cashboxIdNum <= 0) {
      toast.error('Kassa seçin');
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await paymentsApi.recordBulk({
        childId: effectiveChildId,
        year: bulkYear,
        cashboxId: cashboxIdNum,
        months: Array.from(bulkSelectedMonths).sort((a, b) => a - b),
        notes: typeof watchedNotes === 'string' && watchedNotes.trim() ? watchedNotes.trim() : undefined,
      });
      toast.success(`${res.paidCount} ay üçün ${formatCurrency(res.totalPaid)} qeyd edildi`);
      // Refresh history so the grid updates instantly
      try {
        const fresh = await paymentsApi.getChildHistory(effectiveChildId);
        setHistory(fresh);
      } catch {/* ignore */}
      setBulkSelectedMonths(new Set());
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xəta baş verdi';
      toast.error(message);
    } finally {
      setBulkSubmitting(false);
    }
  };

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
      const recorded = await paymentsApi.record({
        ...data,
        roundingDiscount: effectiveRoundingDiscount > 0 ? effectiveRoundingDiscount : undefined,
      });
      setLastRecordedPaymentId(recorded.id);
      setRoundingState(null);
      toast.success(
        effectiveRoundingDiscount > 0
          ? `Ödəniş qeyd edildi (yuvarlaqlaşdırma endirimi: ${formatCurrency(effectiveRoundingDiscount)})`
          : 'Ödəniş uğurla qeyd edildi'
      );
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
                  setLastRecordedPaymentId(null);
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
                                setLastRecordedPaymentId(null);
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

      {/* Mode toggle: Bir ay / Çoxlu ay */}
      <div className="flex items-center gap-1 rounded-xl border border-white-border dark:border-gray-700/60 bg-gray-50 dark:bg-[#252836] p-1">
        <button
          type="button"
          onClick={() => setMode('single')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
            mode === 'single'
              ? 'bg-white dark:bg-[#1e2130] text-primary shadow-sm ring-1 ring-primary/15'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          )}
        >
          <CalendarDays size={13} /> Bir ay
        </button>
        <button
          type="button"
          onClick={() => setMode('bulk')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
            mode === 'bulk'
              ? 'bg-white dark:bg-[#1e2130] text-primary shadow-sm ring-1 ring-primary/15'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          )}
        >
          <Layers size={13} /> Çoxlu ay
        </button>
      </div>

      {mode === 'single' && (
        <>
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
                <p className="text-gray-400 flex items-center gap-1">Aylıq məbləğ {currentChildDiscount > 0 && <span className="inline-flex items-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 border border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">-{currentChildDiscount}%</span>}</p>
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

            {periodInfo && currentPayment && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 dark:bg-blue-900/15 dark:border-blue-800/40 px-3 py-2">
                <p className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Info size={12} /> Niyə {formatCurrency(currentPayment.finalAmount)}? (tam aylıq deyil)
                </p>
                <div className="mt-1 space-y-0.5 text-[11px] text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
                  <p>
                    Uşaq <b>{monthLabel}</b> ayında {periodInfo.startDay}-dən {periodInfo.endDay}-ə kimi bağçada olub
                    {' '}= <b>{periodInfo.daysActive} gün</b>.
                  </p>
                  {currentChildRawMonthlyFee > 0 && (
                    <p className="font-mono-nums">
                      Hesablama: {currentChildRawMonthlyFee} ₼ × {periodInfo.daysActive} gün ÷ {daysInMonthCount} gün
                      {currentChildDiscount > 0 ? (
                        <> × (1 − {currentChildDiscount}%)</>
                      ) : null}
                      {' = '}<b>{formatCurrency(currentPayment.finalAmount)}</b>
                    </p>
                  )}
                </div>
              </div>
            )}

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
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Məbləğ (₼) *
            {currentChildDiscount > 0 && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                Endirimli
              </span>
            )}
          </label>
          {canRoundDown && !effectiveRoundingDiscount && (
            <button
              type="button"
              onClick={handleRoundDown}
              title="Ən yaxın 10 ₼-ə aşağı yuvarlaqlaşdır"
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors dark:bg-amber-900/20 dark:border-amber-800/40 dark:text-amber-400 dark:hover:bg-amber-900/30"
            >
              <ArrowDownToLine size={11} /> Yuvarlaqlaşdır
            </button>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₼</span>
          <input
            {...register('amount', {
              valueAsNumber: true,
              onChange: () => {
                // If admin manually edits the amount, drop any active rounding state.
                if (roundingState) setRoundingState(null);
              },
            })}
            type="number"
            step="0.01"
            className="w-full h-10 pl-8 pr-4 text-sm border border-white-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="300.00"
            min={0.01}
          />
        </div>
        {errors.amount && <p className="mt-1 text-xs text-accent-rose">⚠ {errors.amount.message}</p>}
        {effectiveRoundingDiscount > 0 && (
          <div className="mt-1.5 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-[11px] dark:bg-amber-900/15 dark:border-amber-800/40">
            <span className="text-amber-800 dark:text-amber-300">
              <b>Yuvarlaqlaşdırma endirimi:</b> {formatCurrency(effectiveRoundingDiscount)} bağışlanacaq
            </span>
            <button
              type="button"
              onClick={handleClearRounding}
              className="text-[10px] font-semibold text-amber-700 hover:underline dark:text-amber-400"
            >
              Geri qaytar
            </button>
          </div>
        )}
      </div>
        </>
      )}

      {mode === 'bulk' && (
        <div className="space-y-3">
          {!effectiveChildId ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              Çoxlu ay seçimi üçün əvvəlcə uşaq seçin.
            </div>
          ) : (
            <>
              {/* Year selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white-border dark:border-gray-700/60 bg-gray-50/60 dark:bg-[#252836] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">İl</span>
                </div>
                <div className="flex items-center gap-1">
                  {yearOptions.map((y) => (
                    <button
                      type="button"
                      key={y.value}
                      onClick={() => setBulkYear(Number(y.value))}
                      className={cn(
                        'min-w-[56px] rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
                        bulkYear === Number(y.value)
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-white dark:bg-[#1e2130] text-gray-500 dark:text-gray-400 border border-white-border dark:border-gray-700/60 hover:text-gray-700 dark:hover:text-gray-200'
                      )}
                    >
                      {y.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk actions */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Ayları seçin
                </p>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllBulkMonths}
                    disabled={historyLoading || bulkAvailableMonths.length === 0}
                    className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    Hamısını seç
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    type="button"
                    onClick={clearBulkSelection}
                    disabled={bulkSelectedMonths.size === 0}
                    className="font-semibold text-gray-500 dark:text-gray-400 hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    Sıfırla
                  </button>
                </div>
              </div>

              {/* 12-month grid */}
              {historyLoading ? (
                <div className="rounded-xl border border-white-border dark:border-gray-700/60 bg-gray-50/60 dark:bg-[#252836] p-3 text-center text-xs text-gray-400">
                  Yüklənir...
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const state = bulkMonthsState[m];
                    if (!state) return null;
                    const style = BULK_MONTH_STYLES[state.status];
                    const isSelected = bulkSelectedMonths.has(m);
                    const isDisabled = state.status === 'paid' || state.status === 'free';
                    const monthLabel = MONTH_OPTIONS[m - 1].label;

                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleBulkMonth(m)}
                        disabled={isDisabled}
                        className={cn(
                          'relative rounded-xl border-2 p-2.5 text-left transition-all overflow-hidden',
                          style.bg,
                          isSelected && !isDisabled ? 'ring-2 ring-primary border-primary scale-[1.02] shadow-md' : 'border-transparent',
                          isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm hover:-translate-y-px active:scale-[0.98]'
                        )}
                      >
                        {isSelected && !isDisabled && (
                          <span className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{monthLabel}</span>
                        </div>
                        <div className={cn('mt-1 inline-flex items-center gap-1 text-[10px] font-semibold', style.textColor)}>
                          <span>{style.icon}</span>
                          <span>{style.label}</span>
                        </div>
                        <div className="mt-1 text-sm font-bold font-mono-nums text-gray-800 dark:text-gray-100">
                          {state.amountDue > 0 ? formatCurrency(state.amountDue) : '—'}
                        </div>
                        {state.status === 'partial' && state.paidSoFar > 0 && (
                          <div className="mt-0.5 text-[9px] text-gray-500 dark:text-gray-400 font-mono-nums truncate">
                            Ödənilib: {formatCurrency(state.paidSoFar)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Summary */}
              <div className={cn(
                'rounded-xl border p-3 flex items-center justify-between transition-all',
                bulkSelectedMonths.size > 0
                  ? 'border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-sm'
                  : 'border-white-border dark:border-gray-700/60 bg-gray-50/60 dark:bg-[#252836]'
              )}>
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Seçilmiş</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-0.5">
                    {bulkSelectedMonths.size} ay
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Toplam məbləğ</p>
                  <p className={cn(
                    'text-2xl font-extrabold font-mono-nums leading-none mt-0.5',
                    bulkSelectedMonths.size > 0 ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
                  )}>
                    {formatCurrency(bulkTotal)}
                  </p>
                </div>
              </div>

              {currentChildDiscount > 0 && currentChildDiscount < 100 && (
                <div className="rounded-lg border border-rose-100 bg-rose-50/60 dark:bg-rose-900/10 dark:border-rose-900/40 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-400">
                  Bu uşağa <b>{currentChildDiscount}%</b> endirim tətbiq olunub — məbləğlər endirimli göstərilir.
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Select
        {...register('cashboxId', { valueAsNumber: true })}
        label="Kassa *"
        options={cashboxes}
        disabled={cashboxesLoading}
        error={errors.cashboxId?.message}
      />
      <Input {...register('notes')} label="Qeyd (opsional)" placeholder="Əlave məlumat..." />
      {mode === 'single' && currentPayment && currentPayment.paidAmount > 0 && (
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
        {mode === 'single' && (
          <Button
            type="button"
            variant="secondary"
            disabled={!lastRecordedPaymentId}
            loading={receiptLoading}
            onClick={() => lastRecordedPaymentId && handleShowReceipt(lastRecordedPaymentId)}
          >
            <ReceiptText size={14} /> Çeki göstər
          </Button>
        )}
        {mode === 'single' ? (
          <Button type="submit" className="flex-1" loading={isSubmitting} disabled={!!lastRecordedPaymentId}>
            <DollarSign size={14} /> Qeyd et
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1"
            loading={bulkSubmitting}
            disabled={bulkSelectedMonths.size === 0 || !effectiveChildId}
            onClick={handleBulkSubmit}
          >
            <DollarSign size={14} />
            {bulkSelectedMonths.size > 0
              ? `${bulkSelectedMonths.size} ay üçün qeyd et`
              : 'Qeyd et'}
          </Button>
        )}
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
