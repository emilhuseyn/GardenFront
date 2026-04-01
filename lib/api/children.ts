import apiClient, { unwrap } from './client';
import type { Child, ChildFormData, PaginatedResponse, ChildFilters } from '@/types';

function extractFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  // RFC 5987: filename*=UTF-8''...
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/"/g, ''));
    } catch {
      return utf8Match[1].trim().replace(/"/g, '');
    }
  }

  // Basic fallback: filename="..." or filename=...
  const basicMatch = contentDisposition.match(/filename=([^;]+)/i);
  if (!basicMatch?.[1]) return null;
  return basicMatch[1].trim().replace(/^"|"$/g, '');
}

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

  downloadAgreement: async (id: number): Promise<{ blob: Blob; fileName: string }> => {
    const res = await apiClient.get(`/api/childrens/${id}/agreement`, {
      responseType: 'blob',
      headers: {
        Accept: '*/*',
      },
    });

    const contentDisposition = (res.headers['content-disposition'] as string | undefined) ?? null;
    const fileName = extractFileName(contentDisposition) || `Razilasma_${id}.doc`;
    return { blob: res.data as Blob, fileName };
  },
};
