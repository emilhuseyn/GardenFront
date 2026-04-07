'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowRightLeft, CalendarClock } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cashboxesApi } from '@/lib/api/cashboxes';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { CashboxTransferHistory } from '@/types';

interface TransferHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TransferHistoryModal({ isOpen, onClose }: TransferHistoryModalProps) {
  const [transfers, setTransfers] = useState<CashboxTransferHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    const fetchTransfers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await cashboxesApi.getTransferHistory();
        if (active) setTransfers(data);
      } catch (err: unknown) {
        if (active) setError((err as { message?: string })?.message ?? 'Xəta baş verdi.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTransfers();

    return () => { active = false; };
  }, [isOpen]);

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>Kassalar arası köçürmə tarixçəsi</ModalTitle>
        </ModalHeader>

        <div className="min-h-[250px] max-h-[60vh] overflow-y-auto px-1 hide-scrollbar">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 dark:text-red-400 rounded-lg mb-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                <ArrowRightLeft className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Köçürmə tapılmadı</h3>
              <p className="text-sm text-gray-500 max-w-[250px]">Kassalar arasında hələ heç bir köçürmə əməliyyatı edilməyib.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {transfers.map((t) => (
                <div 
                  key={t.id} 
                  className="group relative flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-1 items-center gap-4 min-w-0">
                    <div className="h-12 w-12 shrink-0 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100/50 dark:border-blue-500/20 group-hover:scale-105 transition-transform">
                      <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    
                    <div className="flex flex-col min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[120px] sm:max-w-none">
                          {t.fromCashboxName}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[120px] sm:max-w-none">
                          {t.toCashboxName}
                        </span>
                      </div>
                      
                      <div className="flex flex-row items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <CalendarClock className="w-3.5 h-3.5" />
                          <span>{formatDate(t.transferDate, 'dd MMM yyyy, HH:mm')}</span>
                        </div>
                        {t.note && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                            <span className="truncate" title={t.note}>
                              {t.note}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end pl-4 border-l border-gray-100 dark:border-gray-700/50">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatCurrency(t.amount)}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mt-0.5">
                      Transfersiya
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>Bağla</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
