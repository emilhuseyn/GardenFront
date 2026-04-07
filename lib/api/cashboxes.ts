import apiClient, { unwrap } from './client';
import type {
  Cashbox,
  CashboxMonthlyBalance,
  CashboxOperation,
  CashboxOperationRequest,
  CashboxTransferHistory,
  SetOpeningBalanceRequest,
} from '@/types';

const CASHBOX_BASE = '/api/cashboxeses';

export const cashboxesApi = {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  getAll: async (onlyActive = false) => {
    const res = await apiClient.get(CASHBOX_BASE, { params: { onlyActive } });
    return unwrap<Cashbox[]>(res);
  },

  getById: async (id: number) => {
    const res = await apiClient.get(`${CASHBOX_BASE}/${id}`);
    return unwrap<Cashbox>(res);
  },

  create: async (data: { name: string; type: string; accountNumber?: string }) => {
    const res = await apiClient.post(CASHBOX_BASE, data);
    return unwrap<Cashbox>(res);
  },

  update: async (id: number, data: { name?: string; type?: string; accountNumber?: string; isActive?: boolean }) => {
    const res = await apiClient.put(`${CASHBOX_BASE}/${id}`, data);
    return unwrap<Cashbox>(res);
  },

  deactivate: async (id: number) => {
    const res = await apiClient.patch(`${CASHBOX_BASE}/${id}/deactivate`);
    return unwrap<string>(res);
  },

  // ── Aylıq açılış qalığı ───────────────────────────────────────────────────

  /** Kassanın müəyyən ay/ilin balansını gətir (openingBalance + monthlyIncome). */
  getMonthlyBalance: async (id: number, month: number, year: number) => {
    const res = await apiClient.get(`${CASHBOX_BASE}/${id}/balance`, { params: { month, year } });
    return unwrap<CashboxMonthlyBalance>(res);
  },

  /** Kassanın bütün aylıq balans tarixçəsini gətir. */
  getBalanceHistory: async (id: number) => {
    const res = await apiClient.get(`${CASHBOX_BASE}/${id}/balance/history`);
    return unwrap<CashboxMonthlyBalance[]>(res);
  },

  /** Kassanın açılış qalığını əlavə et və ya yenilə. */
  setOpeningBalance: async (id: number, data: SetOpeningBalanceRequest) => {
    const res = await apiClient.put(`${CASHBOX_BASE}/${id}/balance`, data);
    return unwrap<CashboxMonthlyBalance>(res);
  },

  // ── Kassa əməliyyatları (mədaxil / məxaric) ───────────────────────────────

  addIncome: async (id: number, data: CashboxOperationRequest) => {
    const res = await apiClient.post(`${CASHBOX_BASE}/${id}/income`, data);
    return unwrap<CashboxOperation>(res);
  },

  addExpense: async (id: number, data: CashboxOperationRequest) => {
    const res = await apiClient.post(`${CASHBOX_BASE}/${id}/expense`, data);
    return unwrap<CashboxOperation>(res);
  },

  getOperations: async (id: number, params?: { month?: number; year?: number }) => {
    const res = await apiClient.get(`${CASHBOX_BASE}/${id}/operations`, { params });
    return unwrap<CashboxOperation[]>(res);
  },

  // ── Kassalar arası köçürmə ───────────────────────────────────────────────

  transfer: async (data: { fromCashboxId: number; toCashboxId: number; amount: number; note?: string }) => {
    const res = await apiClient.post(`${CASHBOX_BASE}/transfer`, data);
    return unwrap<{
      fromCashboxName: string;
      toCashboxName: string;
      amount: number;
      fromCashboxBalanceAfter: number;
      toCashboxBalanceAfter: number;
    }>(res);
  },

  getTransferHistory: async (cashboxId?: number) => {
    const params = cashboxId ? { cashboxId } : {};
    const res = await apiClient.get(`${CASHBOX_BASE}/transfers`, { params });
    return unwrap<CashboxTransferHistory[]>(res);
  },
};
