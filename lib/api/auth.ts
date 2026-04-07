import apiClient, { unwrap } from './client';
import type { LoginResponse } from '@/types';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post<{ success: boolean; data: LoginResponse; message?: string; errors?: string[] | null; statusCode: number }>(
      '/api/auths/login',
      { email, password }
    );
    return unwrap<LoginResponse>(res);
  },

  register: async (data: { firstName: string; lastName: string; email: string; password: string; role: string }) => {
    const res = await apiClient.post('/api/auths/register', data);
    return unwrap(res);
  },

  me: async () => {
    const res = await apiClient.get<{ success: boolean; data: Record<string, unknown>; message?: string; errors?: string[] | null; statusCode: number }>(
      '/api/auths/me'
    );
    const raw = unwrap<Record<string, unknown>>(res);
    const firstName = (raw.firstName ?? (raw.fullName as string)?.split(' ')[0] ?? '') as string;
    const lastName  = (raw.lastName  ?? (raw.fullName as string)?.split(' ').slice(1).join(' ') ?? '') as string;
    return {
      ...raw,
      id:          String(raw.id ?? ''),
      firstName,
      lastName,
      name:        `${firstName} ${lastName}`.trim(),
      email:       raw.email as string,
      role:        raw.role as import('@/types').UserRole,
      isActive:    raw.isActive as boolean,
      phoneNumber: (raw.phoneNumber ?? '') as string,
    };
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await apiClient.put('/api/auths/change-password', { currentPassword, newPassword });
    return unwrap(res);
  },

  updateProfile: async (data: { firstName: string; lastName: string; email: string; phoneNumber?: string }) => {
    const res = await apiClient.put('/api/auths/profile', data);
    return unwrap<{ firstName: string; lastName: string; email: string; phoneNumber?: string }>(res);
  },
};
