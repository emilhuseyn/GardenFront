'use client';
import { useEffect, useMemo, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { addDays, format } from 'date-fns';
import {
  Modal, ModalContent, ModalHeader, ModalTitle,
  ModalDescription, ModalFooter, ModalClose,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';
import { toast } from 'sonner';

interface ActivateChildModalProps {
  open: boolean;
  onClose: () => void;
  /** returnDate — 'yyyy-MM-dd'. Uşağın YENİDƏN GƏLDİYİ İLK gün (həmin gün hesablanır). */
  onConfirm: (returnDate: string) => void | Promise<void>;
  /** Bir uşağın adı və ya toplu əməliyyat üçün "3 uşaq" kimi mətn */
  childName: string;
  /** Ən gec qeydiyyat tarixi ('yyyy-MM-dd') — bundan əvvəlki tarix seçilə bilməz */
  minDate?: string | null;
  /** Aylıq ödəniş — verilsə təxmini məbləğ də göstərilir. */
  monthlyFee?: number | null;
  /** Endirim faizi — məbləğ hesabında tətbiq olunur. */
  discountPercentage?: number | null;
  loading?: boolean;
}

/** Backend ilə eyni yuvarlaqlaşdırma: tam manat, yarımlar yuxarı (məbləğlər mənfi olmur). */
const roundManat = (value: number) => Math.round(value);

const parseYmd = (value?: string | null) => {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
};

export function ActivateChildModal({
  open, onClose, onConfirm, childName, minDate,
  monthlyFee, discountPercentage, loading,
}: ActivateChildModalProps) {
  // Qayıdış tarixi İNKLÜZİVDİR — uşaq həmin gün gəlir, ona görə maksimum SABAHDIR
  // (bugün qərar verilib "sabahdan gəlir" halı).
  const maxDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setError('');
    }
  }, [open]);

  const validate = (value: string) => {
    if (!value) return 'Qayıdış tarixini seçin.';
    if (value > maxDate) return 'Qayıdış tarixi sabahdan gec ola bilməz.';
    if (minDate && value < minDate)
      return `Qayıdış tarixi qəbul tarixindən (${formatDateShort(minDate)}) əvvəl ola bilməz.`;
    return '';
  };

  /**
   * Backend ilə EYNİ qayda: dövr [qayıdış günü, ayın sonu] və hər iki ucu DAXİLDİR,
   * yəni gün sayı = ayın günləri - qayıdış günü + 1.
   */
  const preview = useMemo(() => {
    const selected = parseYmd(date);
    if (!selected) return null;

    const daysInMonth = new Date(selected.y, selected.m, 0).getDate();
    const days = daysInMonth - selected.d + 1;

    let amount: number | null = null;
    if (typeof monthlyFee === 'number' && monthlyFee > 0) {
      const base = days >= daysInMonth ? monthlyFee : roundManat((monthlyFee * days) / daysInMonth);
      const percent = discountPercentage ?? 0;
      amount = percent > 0 ? roundManat(base * (1 - percent / 100)) : base;
    }

    return { days, daysInMonth, startDay: selected.d, amount };
  }, [date, monthlyFee, discountPercentage]);

  const handleConfirm = async () => {
    const message = validate(date);
    if (message) {
      setError(message);
      toast.error(message);
      return;
    }
    setError('');
    await onConfirm(date);
  };

  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <ModalContent size="sm">
        <ModalHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <UserCheck size={18} className="text-green-600" />
            </div>
            <ModalTitle>Uşağı aktiv et</ModalTitle>
          </div>
          <ModalDescription>
            <span className="font-semibold text-gray-800 dark:text-gray-200">&quot;{childName}&quot;</span> üçün uşağın{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">yenidən gəldiyi ilk günü</span> seçin.
            Həmin gün DƏ hesablanır: 19 avqust seçsəniz avqust 19-31 (13 gün) hesablanır və həmin ay üçün borc yazılır.
            Qayıdışdan əvvəlki sıfırlanmış aylar &quot;gəlmədiyi ay&quot; kimi yekunlaşdırılır.
          </ModalDescription>
        </ModalHeader>

        <Input
          id="activate-return-date"
          type="date"
          label="Yenidən gəldiyi ilk gün"
          value={date}
          min={minDate ?? undefined}
          max={maxDate}
          disabled={loading}
          onChange={(e) => { setDate(e.target.value); setError(''); }}
          error={error || undefined}
          hint="Uşaq sabahdan gələcəksə SABAHI seçin. Default: bugün."
        />

        {preview && !error && (
          <div className="mt-2 rounded-xl border border-white-border dark:border-gray-700/60 bg-white-warm dark:bg-gray-800/40 px-3 py-2">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Bu ay üçün:{' '}
              <span className="font-semibold text-gray-900 dark:text-gray-50">
                {preview.startDay}-{preview.daysInMonth} ({preview.days} gün)
              </span>
              {preview.amount !== null && (
                <>
                  {' '}·{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    ≈ {formatCurrency(preview.amount)}
                  </span>
                </>
              )}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Uşaq həmin ayda çıxıb yenidən qayıdıbsa əvvəlki günlər də üstünə gəlir.
            </p>
          </div>
        )}

        <ModalFooter>
          <ModalClose asChild>
            <Button variant="secondary" size="sm" disabled={loading} onClick={onClose}>
              Ləğv et
            </Button>
          </ModalClose>
          <Button variant="primary" size="sm" loading={loading} onClick={handleConfirm}>
            <UserCheck size={14} /> Aktiv et
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
