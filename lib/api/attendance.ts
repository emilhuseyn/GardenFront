import apiClient, { unwrap } from './client';
import type { DailyAttendance, MonthlyAttendance, AttendanceEntry, MarkAttendanceEntry, HikvisionLog } from '@/types';

export const attendanceApi = {
  getDaily: async (date: string, groupId?: number, options?: { silentError?: boolean }) => {
    const res = await apiClient.get('/api/attendances/daily', {
      params: { date, groupId },
      headers: options?.silentError ? { 'X-Silent-Error': '1' } : undefined,
    });
    return unwrap<DailyAttendance>(res);
  },

  getMonthly: async (month: number, year: number, groupId?: number) => {
    const res = await apiClient.get('/api/attendances/monthly', {
      params: { month, year, groupId },
    });
    return unwrap<MonthlyAttendance>(res);
  },

  getChildHistory: async (childId: number, from: string, to: string, options?: { silentError?: boolean }) => {
    const res = await apiClient.get(`/api/attendances/child/${childId}`, {
      params: { from, to },
      headers: options?.silentError ? { 'X-Silent-Error': '1' } : undefined,
    });
    return unwrap<AttendanceEntry[]>(res);
  },

  mark: async (entries: MarkAttendanceEntry[]) => {
    const res = await apiClient.post('/api/attendances/mark', { entries });
    return unwrap(res);
  },

  updateArrival: async (id: number, time: string) => {
    const res = await apiClient.patch(`/api/attendances/${id}/arrival`, JSON.stringify(time), {
      headers: { 'Content-Type': 'application/json' },
    });
    return unwrap(res);
  },

  updateDeparture: async (id: number, time: string) => {
    const res = await apiClient.patch(`/api/attendances/${id}/departure`, JSON.stringify(time), {
      headers: { 'Content-Type': 'application/json' },
    });
    return unwrap(res);
  },

  hikvisionSync: async (date?: string): Promise<{ accepted: boolean; jobId?: string }> => {
    // Sizin əvvəlki struktur - bu metod POST atır və sinxronizasiyanı başladır. Return: jobId
    let res;
    const params = date ? { date } : undefined;
    try {
      res = await apiClient.post('/api/attendance/hikvision-sync', null, { params });
    } catch {
      res = await apiClient.post('/api/attendances/hikvision-sync', null, { params });
    }

    let payload: Record<string, unknown>;
    try {
      payload = unwrap<Record<string, unknown>>(res);
    } catch {
      payload = (res.data ?? {}) as Record<string, unknown>;
    }
    
    const jobIdRaw = payload.jobId ?? payload.JobId;
    return {
      accepted: res.status === 202 || res.status === 200,
      jobId: typeof jobIdRaw === 'string' ? jobIdRaw : jobIdRaw != null ? String(jobIdRaw) : undefined,
    };
  },

  getHikvisionLogs: async (from?: string, to?: string): Promise<HikvisionLog[]> => {
    // YENİ GET endpoints: /api/attendances/hikvision-logs
    const params: { from?: string; to?: string } = {};
    if (from) params.from = from;
    if (to) params.to = to;
    
    // Direct call to attendances 
    const res = await apiClient.get('/api/attendances/hikvision-logs', { params });

    try {
      return unwrap<HikvisionLog[]>(res);
    } catch {
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.data)) return data.data; 
      if (data && Array.isArray(data.Data)) return data.Data;
      return [];
    }
  },
};
