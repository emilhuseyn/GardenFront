import apiClient, { unwrap } from './client';
import type { ScheduleConfig } from '@/types';

export const schedulesApi = {
  getAll: async () => {
    const res = await apiClient.get('/api/schedules');
    return unwrap<ScheduleConfig[]>(res);
  },

  update: async (id: number, data: { startTime: string; endTime: string }) => {
    const res = await apiClient.put(`/api/schedules/${id}`, data);
    return unwrap<ScheduleConfig>(res);
  },
};
