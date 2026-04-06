'use client';
import { useState, useEffect } from 'react';
import { cashboxesApi } from '@/lib/api/cashboxes';
import type { Cashbox } from '@/types';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';

interface CashboxFormProps {
  isOpen: boolean;
  onClose: () => void;
  cashbox?: Cashbox;
  onSuccess: () => void;
}

export function CashboxForm({ isOpen, onClose, cashbox, onSuccess }: CashboxFormProps) {
  const [formData, setFormData] = useState<Partial<Cashbox>>({
    name: '',
    type: 'Cash',
    accountNumber: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error && err.message.trim()) {
      return err.message;
    }

    if (typeof err === 'object' && err !== null) {
      const responseData = (err as { response?: { data?: Record<string, unknown> } }).response?.data;
      const msg = responseData?.Message ?? responseData?.message;
      const errors = responseData?.Errors ?? responseData?.errors;

      if (Array.isArray(errors) && errors.length > 0) {
        const first = errors.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
        if (first) return first;
      }

      if (typeof msg === 'string' && msg.trim()) {
        return msg;
      }
    }

    return 'Xəta baş verdi.';
  };

  useEffect(() => {
    if (isOpen) {
      if (cashbox) {
        setFormData({
          name: cashbox.name,
          type: cashbox.type,
          accountNumber: cashbox.accountNumber || '',
          isActive: cashbox.isActive,
        });
      } else {
        setFormData({
          name: '',
          type: 'Cash',
          accountNumber: '',
          isActive: true,
        });
      }
      setError(null);
    }
  }, [isOpen, cashbox]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setError('Zəhmət olmasa kassa adını qeyd edin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (cashbox?.id) {
        await cashboxesApi.update(cashbox.id, formData);
      } else {
        await cashboxesApi.create(formData);
      }

      onSuccess();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>{cashbox ? 'Kassaya düzəliş et' : 'Yeni Kassa Yarat'}</ModalTitle>
        </ModalHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Kassa Adı
          </label>
          <Input
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Məs: Nağd Kassa 1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipi
          </label>
          <Select
            value={formData.type || 'Cash'}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as Cashbox['type'] })}
            options={[
              { value: 'Cash', label: 'Nağd Kassa' },
              { value: 'Cashless', label: 'Pos Terminal (Nağdsız)' },
              { value: 'CardAccount', label: 'Kart Hesabı' },
            ]}
          />
        </div>

        {formData.type !== 'Cash' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Test Hesab və ya Kart Nömrəsi (opsional)
            </label>
            <Input
              value={formData.accountNumber || ''}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="Məs: AZXX..."
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Kassa Statusu
            </label>
            <p className="text-xs text-gray-500">
              Aktiv kassalara ödəniş daxil edilə bilər
            </p>
          </div>
          <Switch
            checked={formData.isActive || false}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Ləğv et
          </Button>
          <Button type="submit" disabled={loading} className="min-w-[100px]">
            {loading ? 'Yüklənir...' : 'Yadda saxla'}
          </Button>
        </ModalFooter>
      </form>
    </ModalContent>
  </Modal>
  );
}