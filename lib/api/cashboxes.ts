import apiClient, { unwrap } from './client';
import type { Cashbox } from '@/types';

export const cashboxesApi = {
  getAll: async () => {
    const res = await apiClient.get('/api/cashboxes');
    return unwrap<Cashbox[]>(res);
  },
  getActive: async () => {
    const res = await apiClient.get('/api/cashboxes', { params: { activeOnly: true } });
    return unwrap<Cashbox[]>(res);
  },
  getById: async (id: number) => {
    const res = await apiClient.get(`/api/cashboxes/${id}`);
    return unwrap<Cashbox>(res);
  },
  create: async (data: Partial<Cashbox>) => {
    const res = await apiClient.post('/api/cashboxes', data);
    return unwrap<Cashbox>(res);
  },
  update: async (id: number, data: Partial<Cashbox>) => {
    const res = await apiClient.put(`/api/cashboxes/${id}`, data);
    return unwrap<Cashbox>(res);
  },
  toggleStatus: async (id: number, isActive: boolean) => {
    const res = await apiClient.patch(`/api/cashboxes/${id}/status`, { isActive });
    return unwrap<Cashbox>(res);
  }
};