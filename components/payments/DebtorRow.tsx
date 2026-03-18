'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageSquare, CreditCard } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal';
import { formatCurrency, formatPhone } from '@/lib/utils/format';
import { cn } from '@/lib/utils/constants';
import { notificationsApi } from '@/lib/api/notifications';
import { paymentsApi } from '@/lib/api/payments';
import { toast } from 'sonner';
import type { DebtorInfo, Payment } from '@/types';

const AZ_MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'];

interface DebtorRowProps {
  debtor: DebtorInfo;
  index: number;
  onRecord?: (childId: number) => void;
}

export function DebtorRow({ debtor, index, onRecord }: DebtorRowProps) {
  const debtMonths = debtor.unpaidMonths.length;
  const urgency = debtMonths >= 3 ? 'rose' : debtMonths === 2 ? 'amber' : 'orange';
  const [sending, setSending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const ensureHistoryLoaded = async () => {
    if (history.length > 0) return;
    setLoadingHistory(true);
    try {
      const data = await paymentsApi.getChildHistory(debtor.childId);
      setHistory(data);
    } catch {
      toast.error('Məlumat yüklənmədi');
    } finally {
      setLoadingHistory(false);
    }
  };

  const openDebtDetails = async () => {
    setModalOpen(true);
    await ensureHistoryLoaded();
  };

  const openReminderModal = async () => {
    setReminderModalOpen(true);
    await ensureHistoryLoaded();
  };

  const handleSendReminder = async () => {
    setSending(true);
    try {
      await notificationsApi.sendReminder(debtor.childId);
      toast.success(`${debtor.childFullName} - xatırlatma göndərildi`);
      setReminderModalOpen(false);
    } catch {
      toast.error('Mesaj göndərilmədi. WhatsApp qoşulu deyil.');
    } finally {
      setSending(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const debtPreviewItems = (history.length > 0
    ? history
        .filter((p) => p.remainingDebt > 0)
        .sort((a, b) => (b.year - a.year) || (b.month - a.month))
        .map((p) => ({ month: p.month, year: p.year, amount: p.remainingDebt }))
    : debtor.unpaidMonths
        .slice()
        .sort((a, b) => b - a)
        .map((m) => ({ month: m, year: currentYear, amount: undefined as number | undefined }))
  );

  const messagePreview = [
    'Hörmətli valideyn!',
    '',
    'Uşaq bağçamıza göstərdiyiniz etimada görə təşəkkür edirik.',
    '',
    `Sizə xatırlatmaq istəyirik ki, ${debtor.childFullName} adlı övladınızın aşağıdakı aylara aid ödənişi hələ tamamlanmayıb:`,
    '',
    'Aylar və məbləğlər:',
    ...debtPreviewItems.map((d) =>
      d.amount !== undefined
        ? `- ${AZ_MONTHS[d.month - 1]} ${d.year}: ${formatCurrency(d.amount)}`
        : `- ${AZ_MONTHS[d.month - 1]} ${d.year}`
    ),
    `Ümumi borc: ${formatCurrency(debtor.totalDebt)}`,
    '',
    'Zəhmət olmasa ödənişi ən qısa müddətdə həyata keçirməyinizi xahiş edirik.',
  ].join('\n');

  const historyForDetails = history
    .filter((p) => p.year === currentYear)
    .sort((a, b) => a.month - b.month);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-[#1e2130] border rounded-xl transition-colors',
        debtMonths >= 3 ? 'border-rose-200 dark:border-rose-800/50 bg-rose-50/30 dark:bg-rose-900/10' : 'border-white-border dark:border-gray-700/60'
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <Avatar name={debtor.childFullName} size="md" />
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{debtor.childFullName}</p>
          <p className="text-xs text-gray-400">{debtor.groupName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatPhone(debtor.parentPhone)}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-xs text-gray-400">Borc</p>
          <p className="text-sm font-bold text-accent-rose font-mono-nums">{formatCurrency(debtor.totalDebt)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Ay</p>
          <button onClick={openDebtDetails} className="focus:outline-none">
            <Badge variant={urgency as any} size="sm" className="cursor-pointer hover:opacity-80 transition-opacity">{debtMonths} ay</Badge>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={`tel:${debtor.parentPhone}`}
          className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors text-gray-400 hover:text-green-600"
          title="Zəng et"
        >
          <Phone size={15} />
        </a>
        <button
          onClick={openReminderModal}
          disabled={sending}
          className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors text-gray-400 hover:text-accent-blue disabled:opacity-50"
          title="WhatsApp xatırlatma göndər"
        >
          <MessageSquare size={15} />
        </button>
        <Button size="sm" onClick={() => onRecord?.(debtor.childId)}>
          <CreditCard size={13} /> Ödəniş qeyd et
        </Button>
      </div>
    </motion.div>

    {/* Debt details modal */}
    <Modal open={modalOpen} onOpenChange={setModalOpen}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>{debtor.childFullName} - Borc detalları</ModalTitle>
        </ModalHeader>
        <div className="mt-4 space-y-2">
          {loadingHistory ? (
            <p className="text-sm text-gray-400 text-center py-4">Yüklənir...</p>
          ) : historyForDetails.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Məlumat yoxdur</p>
          ) : (
            historyForDetails
              .map((p) => {
                const isUnpaid = p.paidAmount === 0;
                const isPartial = p.paidAmount > 0 && p.remainingDebt > 0;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-4 py-3 text-sm',
                      isUnpaid ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40' :
                      isPartial ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40' :
                      'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/40'
                    )}
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-200">{AZ_MONTHS[p.month - 1]}</span>
                    <div className="text-right space-y-0.5">
                      <p className="text-xs text-gray-500">
                        Ödənildi: <span className="font-semibold text-gray-700">{formatCurrency(p.paidAmount)}</span>
                      </p>
                      {p.remainingDebt > 0 && (
                        <p className="text-xs text-gray-500">
                          Qalıq: <span className="font-semibold text-accent-rose">{formatCurrency(p.remainingDebt)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </ModalContent>
    </Modal>

    {/* Reminder confirmation + message preview modal */}
    <Modal open={reminderModalOpen} onOpenChange={setReminderModalOpen}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>Mesaj göndərilsin?</ModalTitle>
        </ModalHeader>
        <div className="space-y-3">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Bu əməliyyatla <span className="font-semibold">{formatPhone(debtor.parentPhone)}</span> nömrəsinə
            <span className="font-semibold"> {debtor.childFullName}</span> üçün ödəniş xatırlatma mesajı göndəriləcək.
          </p>

          <div className="rounded-xl border border-white-border dark:border-gray-700/60 bg-gray-50/60 dark:bg-gray-800/40 p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Mesaj nümunəsi</p>
            {loadingHistory ? (
              <p className="text-sm text-gray-400">Yüklənir...</p>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 font-sans leading-6">
                {messagePreview}
              </pre>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={() => setReminderModalOpen(false)}>
            Ləğv et
          </Button>
          <Button type="button" onClick={handleSendReminder} loading={sending}>
            Mesajı göndər
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  </>
  );
}
