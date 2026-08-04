'use client';
import { useEffect, useMemo, useState } from 'react';
import { UserX } from 'lucide-react';
import { addDays, format } from 'date-fns';
import {
  Modal, ModalContent, ModalHeader, ModalTitle,
  ModalDescription, ModalFooter, ModalClose,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';
import { toast } from 'sonner';

interface DeactivateChildModalProps {
  open: boolean;
  onClose: () => void;
  /** effectiveDate — 'yyyy-MM-dd'. Uşağın ARTIQ GƏLMƏDİYİ İLK gün (həmin gün hesablanmır). */
  onConfirm: (effectiveDate: string) => void | Promise<void>;
  /** Bir uşağın adı və ya toplu əməliyyat üçün "3 uşaq" kimi mətn */
  childName: string;
  /** Ən gec qeydiyyat tarixi ('yyyy-MM-dd') — bundan əvvəlki tarix seçilə bilməz */
  minDate?: string | null;
  /**
   * Uşağın qəbul tarixi ('yyyy-MM-dd') — canlı gün sayımı üçün. Toplu əməliyyatda uşaqların
   * qəbul tarixi fərqlidirsə boş göndərilir və sayım ayın 1-indən hesablanır.
   */
  registrationDate?: string | null;
  /** Aylıq ödəniş — verilsə təxmini məbləğ də göstərilir (toplu əməliyyatda yalnız hamısı eynidirsə). */
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

export function DeactivateChildModal({
  open, onClose, onConfirm, childName, minDate,
  registrationDate, monthlyFee, discountPercentage, loading,
}: DeactivateChildModalProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  // C2: tarix "artıq gəlmədiyi ilk gün"dür — bu gün gələn uşaq üçün düzgün dəyər SABAHDIR.
  const maxDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');

  // Hər açılışda default bugün olsun
  useEffect(() => {
    if (open) {
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setError('');
    }
  }, [open]);

  // 'yyyy-MM-dd' sətirləri leksikoqrafik müqayisə ilə düzgün sıralanır
  const validate = (value: string) => {
    if (!value) return 'Çıxış tarixini seçin.';
    if (value > maxDate) return 'Çıxış tarixi sabahdan gec ola bilməz.';
    if (minDate && value < minDate)
      return `Çıxış tarixi qəbul tarixindən (${formatDateShort(minDate)}) əvvəl ola bilməz.`;
    return '';
  };

  /**
   * Seçilən tarixin həmin ay üçün nə qədər gün hesablandığı — backend ilə EYNİ yarım-açıq qayda:
   * [startDay, seçilən gün) → gün sayı = max(0, seçilən gün - startDay).
   * startDay qeydiyyat həmin aydadırsa qeydiyyat günü (daxil), əks halda ayın 1-idir.
   */
  const preview = useMemo(() => {
    const selected = parseYmd(date);
    if (!selected) return null;

    const daysInMonth = new Date(selected.y, selected.m, 0).getDate();
    const reg = parseYmd(registrationDate);
    const startDay = reg && reg.y === selected.y && reg.m === selected.m ? reg.d : 1;
    const days = Math.max(0, selected.d - startDay);

    let amount: number | null = null;
    if (typeof monthlyFee === 'number' && monthlyFee > 0) {
      const base = roundManat((monthlyFee * days) / daysInMonth);
      const percent = discountPercentage ?? 0;
      amount = percent > 0 ? roundManat(base * (1 - percent / 100)) : base;
    }

    return { days, daysInMonth, startDay, amount, exact: Boolean(reg) };
  }, [date, registrationDate, monthlyFee, discountPercentage]);

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
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <UserX size={18} className="text-amber-600" />
            </div>
            <ModalTitle>Uşağı deaktiv et</ModalTitle>
          </div>
          <ModalDescription>
            <span className="font-semibold text-gray-800 dark:text-gray-200">&quot;{childName}&quot;</span> üçün uşağın{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">bağçaya gəlmədiyi ilk günü</span> seçin.
            Həmin gün ARTIQ hesablanmır: 1 avqust seçsəniz avqust ayı 0 ₼ olur, 26 avqust seçsəniz 1-25 (25 gün) hesablanır.
            Sonrakı ayların borcu sıfırlanacaq.
          </ModalDescription>
        </ModalHeader>

        <Input
          id="deactivate-effective-date"
          type="date"
          label="Artıq gəlmədiyi ilk gün"
          value={date}
          min={minDate ?? undefined}
          max={maxDate}
          disabled={loading}
          onChange={(e) => { setDate(e.target.value); setError(''); }}
          error={error || undefined}
          hint="Uşaq bu gün də gəlibsə SABAHI seçin. Default: bugün (bugündən etibarən gəlmir)."
        />

        {preview && !error && (
          <div className="mt-2 rounded-xl border border-white-border dark:border-gray-700/60 bg-white-warm dark:bg-gray-800/40 px-3 py-2">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Bu ay üçün:{' '}
              <span className="font-semibold text-gray-900 dark:text-gray-50">{preview.days} gün</span>
              {preview.amount !== null && (
                <>
                  {' '}·{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    ≈ {formatCurrency(preview.amount)}
                  </span>
                </>
              )}
            </p>
            {preview.days === 0 && (
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                Uşaq bu ay heç gəlməmiş sayılır — bu ay üçün borc yazılmayacaq.
              </p>
            )}
            {!preview.exact && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Sayım ayın 1-indən aparılır; həmin ay qeydiyyatdan keçən uşaq üçün daha az ola bilər.
              </p>
            )}
          </div>
        )}

        <ModalFooter>
          <ModalClose asChild>
            <Button variant="secondary" size="sm" disabled={loading} onClick={onClose}>
              Ləğv et
            </Button>
          </ModalClose>
          <Button variant="amber" size="sm" loading={loading} onClick={handleConfirm}>
            <UserX size={14} /> Deaktiv et
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
