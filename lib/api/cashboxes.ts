import apiClient, { unwrap } from './client';
import type { Cashbox, CashboxMonthlyBalance, SetOpeningBalanceRequest } from '@/types';

export const cashboxesApi = {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  getAll: async (onlyActive = false) => {
    const res = await apiClient.get('/api/cashboxeses', { params: { onlyActive } });
    return unwrap<Cashbox[]>(res);
  },

  getById: async (id: number) => {
    const res = await apiClient.get(`/api/cashboxeses/${id}`);
    return unwrap<Cashbox>(res);
  },

  create: async (data: { name: string; type: string; accountNumber?: string }) => {
    const res = await apiClient.post('/api/cashboxeses', data);
    return unwrap<Cashbox>(res);
  },

  update: async (id: number, data: { name?: string; type?: string; accountNumber?: string; isActive?: boolean }) => {
    const res = await apiClient.put(`/api/cashboxeses/${id}`, data);
    return unwrap<Cashbox>(res);
  },

  deactivate: async (id: number) => {
    const res = await apiClient.patch(`/api/cashboxeses/${id}/deactivate`);
    return unwrap<string>(res);
  },

  // ── Aylıq açılış qalığı ───────────────────────────────────────────────────

  /** Kassanın müəyyən ay/ilin balansını gətir (openingBalance + monthlyIncome). */
  getMonthlyBalance: async (id: number, month: number, year: number) => {
    const res = await apiClient.get(`/api/cashboxeses/${id}/balance`, { params: { month, year } });
    return unwrap<CashboxMonthlyBalance>(res);
  },

  /** Kassanın bütün aylıq balans tarixçəsini gətir. */
  getBalanceHistory: async (id: number) => {
    const res = await apiClient.get(`/api/cashboxeses/${id}/balance/history`);
    return unwrap<CashboxMonthlyBalance[]>(res);
  },

  /** Kassanın açılış qalığını əlavə et və ya yenilə. */
  setOpeningBalance: async (id: number, data: SetOpeningBalanceRequest) => {
    const res = await apiClient.put(`/api/cashboxeses/${id}/balance`, data);
    return unwrap<CashboxMonthlyBalance>(res);
  },
};
