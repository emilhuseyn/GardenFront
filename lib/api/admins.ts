import apiClient, { unwrap } from './client';

export interface SeedExcelResult {
  message?: string;
  seededCount?: number;
}

export const adminsApi = {
  seedExcel: async (): Promise<SeedExcelResult> => {
    try {
      const res = await apiClient.post('/api/admins/seed-excel');
      try {
        return unwrap<SeedExcelResult>(res);
      } catch {
        return (res.data ?? {}) as SeedExcelResult;
      }
    } catch {
      const res = await apiClient.get('/api/admins/seed-excel');
      try {
        return unwrap<SeedExcelResult>(res);
      } catch {
        return (res.data ?? {}) as SeedExcelResult;
      }
    }
  },
};
