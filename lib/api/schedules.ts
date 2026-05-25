import apiClient, { unwrap } from './client';
import type { ScheduleConfig, CreateScheduleData, UpdateScheduleData } from '@/types';

// Backend convention: '+s' suffix (paymentses, childrens, schedules)
const BASE = '/api/schedules';

export const schedulesApi = {
  getAll: async (includeInactive = false) => {
    const res = await apiClient.get(BASE, {
      params: { includeInactive: includeInactive || undefined },
    });
    return unwrap<ScheduleConfig[]>(res);
  },

  create: async (data: CreateScheduleData) => {
    const res = await apiClient.post(BASE, data);
    return unwrap<ScheduleConfig>(res);
  },

  update: async (id: number, data: UpdateScheduleData) => {
    const res = await apiClient.put(`${BASE}/${id}`, data);
    return unwrap<ScheduleConfig>(res);
  },

  delete: async (id: number) => {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return unwrap<string>(res);
  },
};
