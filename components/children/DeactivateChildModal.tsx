'use client';
import { useEffect, useState } from 'react';
import { UserX } from 'lucide-react';
import { format } from 'date-fns';
import {
  Modal, ModalContent, ModalHeader, ModalTitle,
  ModalDescription, ModalFooter, ModalClose,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDateShort } from '@/lib/utils/format';
import { toast } from 'sonner';

interface DeactivateChildModalProps {
  open: boolean;
  onClose: () => void;
  /** effectiveDate — 'yyyy-MM-dd' */
  onConfirm: (effectiveDate: string) => void | Promise<void>;
  /** Bir uşağın adı və ya toplu əməliyyat üçün "3 uşaq" kimi mətn */
  childName: string;
  /** Ən gec qeydiyyat tarixi ('yyyy-MM-dd') — bundan əvvəlki tarix seçilə bilməz */
  minDate?: string | null;
  loading?: boolean;
}

export function DeactivateChildModal({
  open, onClose, onConfirm, childName, minDate, loading,
}: DeactivateChildModalProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
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
    if (value > today) return 'Çıxış tarixi gələcək tarix ola bilməz.';
    if (minDate && value < minDate)
      return `Çıxış tarixi qəbul tarixindən (${formatDateShort(minDate)}) əvvəl ola bilməz.`;
    return '';
  };

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
            <span className="font-semibold text-gray-800 dark:text-gray-200">gəldiyi sonuncu günü</span> seçin.
            Həmin ayın ödənişi bu tarixə görə yenidən hesablanacaq, sonrakı ayların borcu sıfırlanacaq.
          </ModalDescription>
        </ModalHeader>

        <Input
          id="deactivate-effective-date"
          type="date"
          label="Sonuncu gəldiyi gün"
          value={date}
          min={minDate ?? undefined}
          max={today}
          disabled={loading}
          onChange={(e) => { setDate(e.target.value); setError(''); }}
          error={error || undefined}
          hint="Həmin gün də hesablanır. Default: bugün."
        />

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
