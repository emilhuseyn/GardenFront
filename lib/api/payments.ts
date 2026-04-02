import apiClient, { unwrap } from './client';
import type { Payment, PaymentFormData, DebtorInfo, MonthlyPaymentReport, DailyPaymentReport, DiscountType } from '@/types';

export const paymentsApi = {
  getDebtors: async (options?: { silentError?: boolean }) => {
    const res = await apiClient.get('/api/paymentses/debtors', {
      headers: options?.silentError ? { 'X-Silent-Error': '1' } : undefined,
    });
    return unwrap<DebtorInfo[]>(res);
  },

  getChildHistory: async (childId: number) => {
    const res = await apiClient.get(`/api/paymentses/child/${childId}`);
    return unwrap<Payment[]>(res);
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

  record: async (data: PaymentFormData) => {
    const res = await apiClient.post('/api/paymentses/record', data);
    return unwrap<Payment>(res);
  },

  generateMonthly: async (month: number, year: number) => {
    const res = await apiClient.post('/api/paymentses/generate-monthly', null, { params: { month, year } });
    return unwrap(res);
  },

  applyDiscount: async (id: number, discountType: DiscountType, discountValue: number) => {
    const res = await apiClient.patch(`/api/paymentses/${id}/discount`, { discountType, discountValue });
    return unwrap<Payment>(res);
  },

  delete: async (id: number) => {
    const res = await apiClient.delete(`/api/payments/${id}`);
    return unwrap(res);
  },
};
