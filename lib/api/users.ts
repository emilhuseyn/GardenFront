import apiClient, { unwrap } from './client';
import type { UserResponse, UserRole } from '@/types';

export const usersApi = {
  getAll: async () => {
    const res = await apiClient.get('/api/userses');
    return unwrap<UserResponse[]>(res);
  },

  getById: async (id: string) => {
    const res = await apiClient.get(`/api/userses/${id}`);
    return unwrap<UserResponse>(res);
  },

  create: async (data: { firstName: string; lastName: string; email: string; password: string; role: UserRole }) => {
    const res = await apiClient.post('/api/userses', data);
    return unwrap<UserResponse>(res);
  },

  update: async (id: string, data: Partial<{ firstName: string; lastName: string; email: string; role: UserRole; isActive: boolean }>) => {
    const res = await apiClient.put(`/api/userses/${id}`, data);
    return unwrap<UserResponse>(res);
  },

  setActive: async (id: string, isActive: boolean) => {
    const res = await apiClient.put(`/api/userses/${id}`, { isActive });
    return unwrap<UserResponse>(res);
  },

  updateRole: async (id: string, role: UserRole) => {
    const res = await apiClient.patch(`/api/users/${id}/roles`, { role });
    return unwrap(res);
  },

  delete: async (id: string) => {
    const res = await apiClient.delete(`/api/userses/${id}`);
    return unwrap(res);
  },

  remove: async (id: string) => {
    const res = await apiClient.delete(`/api/userses/${id}/remove`);
    return unwrap(res);
  },

  getByRole: async (role: UserRole) => {
    const res = await apiClient.get(`/api/userses/by-role/${role}`);
    return unwrap<UserResponse[]>(res);
  },
};
