import apiClient, { unwrap } from './client';

export interface WhatsAppStatus {
  connected: boolean;
  hasQR: boolean;
  message: string;
}

export const notificationsApi = {
  getWhatsAppStatus: async (): Promise<WhatsAppStatus> => {
    const res = await apiClient.get('/api/notificationses/whatsapp/status');
    return unwrap<WhatsAppStatus>(res);
  },

  getWhatsAppQR: async (): Promise<{ qr: string }> => {
    const res = await apiClient.get('/api/notificationses/whatsapp/qr');
    try { return unwrap<{ qr: string }>(res); } catch {
      return res.data as { qr: string };
    }
  },

  sendOverdueAlerts: async (): Promise<void> => {
    await apiClient.post('/api/notificationses/send-overdue-alerts');
  },

  sendReminder: async (childId: number): Promise<void> => {
    await apiClient.post(`/api/notificationses/send-reminder/${childId}`);
  },

  startWhatsApp: async (): Promise<{ started: boolean }> => {
    const res = await apiClient.post('/api/notificationses/whatsapp/start');
    // Handle both envelope { success, data: { started } } and direct { started }
    try { return unwrap<{ started: boolean }>(res); } catch {
      return (res.data ?? { started: true }) as { started: boolean };
    }
  },

  disconnectWhatsApp: async (): Promise<void> => {
    await apiClient.post('/api/notificationses/whatsapp/disconnect');
  },
};
