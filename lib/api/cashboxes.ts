import apiClient, { unwrap } from './client';
import type { Cashbox } from '@/types';

export const cashboxesApi = {
  getAll: async () => {
    const res = await apiClient.get('/api/cashboxeses', { params: { onlyActive: false } });
    return unwrap<Cashbox[]>(res);
  },
  getActive: async () => {
    const res = await apiClient.get('/api/cashboxeses', { params: { onlyActive: true } });
    return unwrap<Cashbox[]>(res);
  },
  getById: async (id: number) => {
    const res = await apiClient.get(`/api/cashboxeses/${id}`);
    return unwrap<Cashbox>(res);
  },
  create: async (data: Partial<Cashbox>) => {
    const res = await apiClient.post('/api/cashboxeses', data);
    return unwrap<Cashbox>(res);
  },
  update: async (id: number, data: Partial<Cashbox>) => {
    const res = await apiClient.put(`/api/cashboxeses/${id}`, data);
    return unwrap<Cashbox>(res);
  },
  toggleStatus: async (id: number, isActive: boolean) => {
    // If backend only has /deactivate, we handle that. Assuming patch with deactivate/activate or status endpoint
    const endpoint = isActive ? `/api/cashboxeses/${id}/activate` : `/api/cashboxeses/${id}/deactivate`;
    const res = await apiClient.patch(endpoint);
    return unwrap<Cashbox>(res);
  }
};