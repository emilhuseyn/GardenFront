import apiClient, { unwrap } from './client';
import type { Statistics, DivisionStats, ActiveInactive } from '@/types';

export const reportsApi = {
  getStatistics: async () => {
    const res = await apiClient.get('/api/reportses/statistics');
    return unwrap<Statistics>(res);
  },

  getDivisionStats: async () => {
    const res = await apiClient.get('/api/reportses/divisions/stats');
    return unwrap<DivisionStats[]>(res);
  },

  getActiveInactive: async () => {
    const res = await apiClient.get('/api/reportses/children/active-inactive');
    return unwrap<ActiveInactive>(res);
  },
};
