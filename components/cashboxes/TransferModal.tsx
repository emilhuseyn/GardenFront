'use client';
import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cashboxesApi } from '@/lib/api/cashboxes';
import { formatCurrency } from '@/lib/utils/format';
import type { Cashbox } from '@/types';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashboxes: Cashbox[];
  onSuccess: () => void;
}

export function TransferModal({ isOpen, onClose, cashboxes, onSuccess }: TransferModalProps) {
  const activeCashboxes = cashboxes.filter((c) => c.isActive);

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFromId(activeCashboxes[0]?.id ? String(activeCashboxes[0].id) : '');
      setToId(activeCashboxes[1]?.id ? String(activeCashboxes[1].id) : '');
      setAmount('');
      setNote('');
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fromCashbox = activeCashboxes.find((c) => String(c.id) === fromId);
  const toCashbox   = activeCashboxes.find((c) => String(c.id) === toId);
  const fromBalance = fromCashbox?.balance ?? 0;
  const parsedAmount = parseFloat(amount);
  const amountExceedsBalance = Number.isFinite(parsedAmount) && parsedAmount > fromBalance;

  const handleSubmit = async () => {
    setError(null);

    if (!fromId || !toId) {
      setError('Kassaları seçin.');
      return;
    }
    if (fromId === toId) {
      setError('Eyni kassaya köçürmə edilə bilməz.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Məbləğ sıfırdan böyük olmalıdır.');
      return;
    }
    if (amountExceedsBalance) {
      setError(
        `"${fromCashbox?.name}" kassasında kifayət qədər vəsait yoxdur. Mövcud balans: ${formatCurrency(fromBalance)}`
      );
      return;
    }

    setLoading(true);
    try {
      const result = await cashboxesApi.transfer({
        fromCashboxId: Number(fromId),
        toCashboxId:   Number(toId),
        amount:        parsedAmount,
        note:          note.trim() || undefined,
      });
      toast.success(
        `${formatCurrency(result.amount)} köçürüldü — ${result.fromCashboxName} → ${result.toCashboxName}`
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Xəta baş verdi.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fromOptions = activeCashboxes.map((c) => ({ value: String(c.id), label: c.name }));
  const toOptions   = activeCashboxes.filter((c) => String(c.id) !== fromId).map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Kassalar arası köçürmə</ModalTitle>
        </ModalHeader>

        <div className="space-y-4 pt-2">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {/* From / To */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Select
                label="Göndərən kassa"
                value={fromId}
                onChange={(e) => {
                  setFromId(e.target.value);
                  setError(null);
                  // toId eyni olmasın
                  if (e.target.value === toId) {
                    const other = activeCashboxes.find((c) => String(c.id) !== e.target.value);
                    setToId(other ? String(other.id) : '');
                  }
                }}
                options={fromOptions}
              />
              {fromCashbox && (
                <p className="mt-1 text-xs text-gray-500">
                  Balans: <span className={`font-semibold ${amountExceedsBalance ? 'text-red-500' : 'text-emerald-600'}`}>
                    {formatCurrency(fromBalance)}
                  </span>
                </p>
              )}
            </div>

            <div className="pb-1 text-gray-400">
              <ArrowRight size={20} />
            </div>

            <div className="flex-1">
              <Select
                label="Qəbul edən kassa"
                value={toId}
                onChange={(e) => { setToId(e.target.value); setError(null); }}
                options={toOptions.length > 0 ? toOptions : [{ value: '', label: 'Digər kassa yoxdur' }]}
              />
              {toCashbox && (
                <p className="mt-1 text-xs text-gray-500">
                  Balans: <span className="font-semibold text-emerald-600">{formatCurrency(toCashbox.balance ?? 0)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Amount */}
          <Input
            label="Məbləğ (₼)"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); }}
            placeholder="0.00"
            className={amountExceedsBalance ? 'border-red-400 focus:ring-red-400' : ''}
          />

          {/* Note */}
          <Input
            label="Qeyd (opsional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Köçürmənin səbəbi..."
          />
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Ləğv et
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={amountExceedsBalance || !parsedAmount || parsedAmount <= 0}
            className="min-w-[100px]"
          >
            Köçür
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
