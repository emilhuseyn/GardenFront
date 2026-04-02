import apiClient, { unwrap } from './client';

export interface WhatsAppStatus {
  connected: boolean;
  hasQR: boolean;
  message: string;
}

export interface DueAndOverdueAlertsResult {
  sent: number;
  failed: number;
  errors: string[];
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

  sendDueAndOverdueAlerts: async (): Promise<DueAndOverdueAlertsResult> => {
    const res = await apiClient.post('/api/notificationses/send-due-and-overdue-alerts');

    let payload: Record<string, unknown>;
    try {
      payload = unwrap<Record<string, unknown>>(res);
    } catch {
      payload = (res.data ?? {}) as Record<string, unknown>;
    }

    const sentRaw = payload.sent ?? payload.Sent ?? 0;
    const failedRaw = payload.failed ?? payload.Failed ?? 0;
    const errorsRaw = payload.errors ?? payload.Errors;

    return {
      sent: Number(sentRaw) || 0,
      failed: Number(failedRaw) || 0,
      errors: Array.isArray(errorsRaw)
        ? errorsRaw.filter((e): e is string => typeof e === 'string')
        : [],
    };
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
