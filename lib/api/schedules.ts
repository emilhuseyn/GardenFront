import apiClient, { unwrap } from './client';
import type { ScheduleConfig, CreateScheduleData, UpdateScheduleData } from '@/types';

export const schedulesApi = {
  getAll: async (includeInactive = false) => {
    const res = await apiClient.get('/api/schedule', {
      params: { includeInactive: includeInactive || undefined },
    });
    return unwrap<ScheduleConfig[]>(res);
  },

  create: async (data: CreateScheduleData) => {
    const res = await apiClient.post('/api/schedule', data);
    return unwrap<ScheduleConfig>(res);
  },

  update: async (id: number, data: UpdateScheduleData) => {
    const res = await apiClient.put(`/api/schedule/${id}`, data);
    return unwrap<ScheduleConfig>(res);
  },

  delete: async (id: number) => {
    const res = await apiClient.delete(`/api/schedule/${id}`);
    return unwrap<string>(res);
  },
};
