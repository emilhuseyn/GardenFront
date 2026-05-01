import apiClient from './client';

export interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  description?: string;
  updatedAt?: string;
}

export const systemSettingsApi = {
  getAll: () => apiClient.get<SystemSetting[]>('/api/systemsettingses'),
  getByKey: (key: string) => apiClient.get<SystemSetting>(`/api/systemsettingses/${key}`),
  update: (key: string, value: string) => apiClient.post<SystemSetting>(`/api/systemsettingses/${key}`, { settingKey: key, settingValue: value }),

  // Yeni endpointlər:
  getMessagingStatus: () => apiClient.get('/api/SystemSettings/messaging-status'),
  toggleMessaging: (enable: boolean) => apiClient.post(`/api/SystemSettings/toggle-messaging?enable=${enable}`),
};
