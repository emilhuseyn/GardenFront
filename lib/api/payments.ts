import apiClient, { unwrap } from './client';
import type { Payment, PaymentFormData, DebtorInfo, MonthlyPaymentReport, DailyPaymentReport, DiscountType } from '@/types';

function extractFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/"/g, ''));
    } catch {
      return utf8Match[1].trim().replace(/"/g, '');
    }
  }

  const basicMatch = contentDisposition.match(/filename=([^;]+)/i);
  if (!basicMatch?.[1]) return null;
  return basicMatch[1].trim().replace(/^"|"$/g, '');
}

/**
 * Backend Payment sətrində kütləvi ödənişin paket ID-si saxlanılır —
 * vahid çeki sonradan tarixçədən təkrar çap etmək üçün.
 */
export interface PaymentWithBatch extends Payment {
  paymentBatchId?: string | null;
}

export const paymentsApi = {
  getDebtors: async (options?: { silentError?: boolean }) => {
    const res = await apiClient.get('/api/paymentses/debtors', {
      headers: options?.silentError ? { 'X-Silent-Error': '1' } : undefined,
    });
    return unwrap<DebtorInfo[]>(res);
  },

  getInactiveDebtors: async (options?: { silentError?: boolean }) => {
    const res = await apiClient.get('/api/paymentses/debtors/inactive', {
      headers: options?.silentError ? { 'X-Silent-Error': '1' } : undefined,
    });
    return unwrap<DebtorInfo[]>(res);
  },

  getChildHistory: async (childId: number) => {
    const res = await apiClient.get(`/api/paymentses/child/${childId}`);
    return unwrap<PaymentWithBatch[]>(res);
  },

  getDailyReport: async (date: string) => {
    const res = await apiClient.get('/api/paymentses/report/daily', { params: { date } });
    return unwrap<DailyPaymentReport>(res);
  },

  getMonthlyReport: async (month: number, year: number) => {
    const res = await apiClient.get('/api/paymentses/report/monthly', { params: { month, year } });
    return unwrap<MonthlyPaymentReport>(res);
  },

  getGroupReport: async (groupId: number, month: number, year: number) => {
    const res = await apiClient.get(`/api/paymentses/report/group/${groupId}`, { params: { month, year } });
    return unwrap<MonthlyPaymentReport>(res);
  },

  getDivisionReport: async (divisionId: number, month: number, year: number) => {
    const res = await apiClient.get(`/api/paymentses/report/division/${divisionId}`, { params: { month, year } });
    return unwrap<MonthlyPaymentReport>(res);
  },

  record: async (data: PaymentFormData & { roundingDiscount?: number }) => {
    const res = await apiClient.post('/api/paymentses/record', data);
    return unwrap<Payment>(res);
  },

  recordBulk: async (data: {
    childId: number;
    year: number;
    cashboxId: number;
    months: number[];
    notes?: string;
    monthOverrides?: Array<{ month: number; startDay?: number; endDay?: number; roundingDiscount?: number }>;
  }) => {
    const res = await apiClient.post('/api/paymentses/record-bulk', data);
    // paymentBatchId — heç bir ay emal olunmayıbsa (hamısı artıq ödənilib) null qayıdır
    return unwrap<{
      paidCount: number;
      totalPaid: number;
      paymentBatchId?: string | null;
      payments: PaymentWithBatch[];
    }>(res);
  },

  generateMonthly: async (month: number, year: number) => {
    const res = await apiClient.post('/api/paymentses/generate-monthly', null, { params: { month, year } });
    return unwrap(res);
  },

  bulkMarkAsPaid: async (month: number, year: number) => {
    const res = await apiClient.post('/api/paymentses/bulk-mark-paid', null, { params: { month, year } });
    return unwrap<{ updatedCount: number }>(res);
  },

  applyDiscount: async (id: number, discountType: DiscountType, discountValue: number) => {
    const res = await apiClient.patch(`/api/paymentses/${id}/discount`, { discountType, discountValue });
    return unwrap<Payment>(res);
  },

  delete: async (id: number) => {
    const res = await apiClient.delete(`/api/paymentses/${id}`);
    return unwrap(res);
  },

  downloadReceipt: async (id: number): Promise<{ blob: Blob; fileName: string }> => {
    const res = await apiClient.get(`/api/paymentses/${id}/receipt`, {
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf,*/*',
      },
    });

    const contentDisposition = (res.headers['content-disposition'] as string | undefined) ?? null;
    const fileName = extractFileName(contentDisposition) || `receipt_${id}.pdf`;
    return { blob: res.data as Blob, fileName };
  },

  // Vahid çek — bir uşağın bir neçə ayı üçün tək PDF.
  // 12 ID sorğu sətrinə sığmadığı üçün backend POST gözləyir.
  downloadBulkReceipt: async (paymentIds: number[]): Promise<{ blob: Blob; fileName: string }> => {
    const res = await apiClient.post(
      '/api/paymentses/receipt/bulk',
      { paymentIds },
      {
        responseType: 'blob',
        headers: {
          Accept: 'application/pdf,*/*',
        },
      }
    );

    const contentDisposition = (res.headers['content-disposition'] as string | undefined) ?? null;
    const fileName = extractFileName(contentDisposition) || `receipt_bulk_${paymentIds.length}_ay.pdf`;
    return { blob: res.data as Blob, fileName };
  },

  // Tarixçədən təkrar çap — kütləvi ödənişin paket ID-si ilə
  downloadBatchReceipt: async (batchId: string): Promise<{ blob: Blob; fileName: string }> => {
    const res = await apiClient.get(`/api/paymentses/receipt/batch/${batchId}`, {
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf,*/*',
      },
    });

    const contentDisposition = (res.headers['content-disposition'] as string | undefined) ?? null;
    const fileName = extractFileName(contentDisposition) || `receipt_batch_${batchId}.pdf`;
    return { blob: res.data as Blob, fileName };
  },
};
