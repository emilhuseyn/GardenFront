import apiClient, { unwrap } from './client';
import type { Child, ChildFormData, PaginatedResponse, ChildFilters } from '@/types';

export const childrenApi = {
  getAll: async (filters?: ChildFilters, options?: { silentError?: boolean }) => {
    const res = await apiClient.get('/api/childrens', {
      params: filters,
      headers: options?.silentError ? { 'X-Silent-Error': '1' } : undefined,
    });
    return unwrap<PaginatedResponse<Child>>(res);
  },

  getById: async (id: number) => {
    const res = await apiClient.get(`/api/childrens/${id}`);
    return unwrap<Child>(res);
  },

  search: async (term: string) => {
    const res = await apiClient.get('/api/childrens/search', { params: { term } });
    return unwrap<Child[]>(res);
  },

  create: async (data: ChildFormData) => {
    const res = await apiClient.post('/api/childrens', data);
    return unwrap<Child>(res);
  },

  update: async (id: number, data: Partial<ChildFormData>) => {
    const res = await apiClient.put(`/api/childrens/${id}`, data);
    return unwrap<Child>(res);
  },

  activate: async (id: number) => {
    const res = await apiClient.patch(`/api/childrens/${id}/activate`);
    return unwrap(res);
  },

  deactivate: async (id: number) => {
    const res = await apiClient.patch(`/api/childrens/${id}/deactivate`);
    return unwrap(res);
  },

  delete: async (id: number) => {
    const res = await apiClient.delete(`/api/childrens/${id}`);
    return unwrap(res);
  },
};
