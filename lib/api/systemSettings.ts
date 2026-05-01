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
  getMessagingStatus: () => apiClient.get('/api/system-settings/messaging-status'),
  toggleMessaging: (enable: boolean) => apiClient.post(`/api/system-settings/toggle-messaging?enable=${enable}`),
};
