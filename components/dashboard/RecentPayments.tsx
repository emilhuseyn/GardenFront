'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrencyShort } from '@/lib/utils/format';
import { paymentsApi } from '@/lib/api/payments';
import { format } from 'date-fns';
import type { Payment, PaymentStatus } from '@/types';

const statusVariant: Record<PaymentStatus, 'paid' | 'partial' | 'unpaid'> = {
  0: 'paid', 1: 'partial', 2: 'unpaid',
  'Paid': 'paid', 'PartiallyPaid': 'partial', 'Debt': 'unpaid',
};

const statusLabel: Record<PaymentStatus, string> = {
  0: 'Ödənilib', 1: 'Qismən', 2: 'Borclu',
  'Paid': 'Ödənilib', 'PartiallyPaid': 'Qismən', 'Debt': 'Borclu',
};

export function RecentPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    paymentsApi.getDailyReport(today)
      .then((report) => setPayments(report.payments.slice(0, 5)))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card padding="none" className="h-full">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <CardTitle className="font-display">Son Ödənişlər</CardTitle>
        <Link href="/payments" className="text-xs text-green-500 hover:text-green-600 font-medium transition-colors">
          Hamısı →
        </Link>
      </div>

      <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-32 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          ))
        ) : payments.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">Bu gün ödəniş yoxdur</p>
        ) : (
          payments.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
            >
              <Avatar name={p.childFullName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{p.childFullName}</p>
                <p className="text-xs text-gray-400">
                  {p.month}/{p.year}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-mono-nums text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {formatCurrencyShort(p.paidAmount)}
                </span>
                <Badge variant={statusVariant[p.status]} size="pill" dot>
                  {statusLabel[p.status]}
                </Badge>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </Card>
  );
}
