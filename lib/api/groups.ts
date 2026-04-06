import apiClient, { unwrap } from './client';
import type { Group, GroupDetail, Division, GroupLogResponse, GroupTeacher } from '@/types';

export const groupsApi = {
  getAll: async () => {
    const res = await apiClient.get('/api/groupses');
    return unwrap<Group[]>(res);
  },

  getById: async (id: number) => {
    const res = await apiClient.get(`/api/groupses/${id}`);
    return unwrap<GroupDetail>(res);
  },

  getByDivision: async (divisionId: number) => {
    const res = await apiClient.get(`/api/groupses/division/${divisionId}`);
    return unwrap<Group[]>(res);
  },

  getLogs: async (id: number) => {
    const res = await apiClient.get(`/api/groupses/${id}/logs`);
    return unwrap<GroupLogResponse[]>(res);
  },

  create: async (data: { name: string; divisionId: number; teacherId?: string; maxChildCount: number; ageCategory: string; language: string }) => {
    const res = await apiClient.post('/api/groupses', data);
    return unwrap<Group>(res);
  },

  update: async (id: number, data: Partial<Group>) => {
    const res = await apiClient.put(`/api/groupses/${id}`, data);
    return unwrap<Group>(res);
  },

  assignTeacher: async (id: number, teacherId: string) => {
    const res = await apiClient.patch(`/api/groupses/${id}/assign-teacher`, { teacherId });
    return unwrap(res);
  },

  getTeachers: async (id: number) => {
    const res = await apiClient.get(`/api/groupses/${id}/teachers`);
    return unwrap<GroupTeacher[]>(res);
  },

  addTeacher: async (id: number, userId: string) => {
    const res = await apiClient.post(`/api/groupses/${id}/teachers`, { userId });
    return unwrap(res);
  },

  removeTeacher: async (id: number, userId: string) => {
    const res = await apiClient.delete(`/api/groupses/${id}/teachers/${userId}`);
    return unwrap(res);
  },

  delete: async (id: number) => {
    const res = await apiClient.delete(`/api/groupses/${id}`);
    return unwrap(res);
  },
};

export const divisionsApi = {
  getAll: async () => {
    const res = await apiClient.get('/api/divisionses');
    return unwrap<Division[]>(res);
  },

  getById: async (id: number) => {
    const res = await apiClient.get(`/api/divisionses/${id}`);
    return unwrap<Division>(res);
  },

  create: async (data: { name: string; language: string; description?: string }) => {
    const res = await apiClient.post('/api/divisionses', data);
    return unwrap<Division>(res);
  },

  update: async (id: number, data: Partial<Division>) => {
    const res = await apiClient.put(`/api/divisionses/${id}`, data);
    return unwrap<Division>(res);
  },

  delete: async (id: number) => {
    const res = await apiClient.delete(`/api/divisionses/${id}`);
    return unwrap(res);
  },
};
