import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

function isSilentErrorRequest(error: AxiosError): boolean {
  const headers = error.config?.headers as Record<string, unknown> | undefined;
  const raw = headers?.['X-Silent-Error'] ?? headers?.['x-silent-error'];
  if (typeof raw === 'string') return raw === '1' || raw.toLowerCase() === 'true';
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'boolean') return raw;
  return false;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5034/', // Backend portunuza uyğunlaşdırıldı
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'az',
  },
});

// Unwrap the standard API response envelope - handles both capitalized and lowercase keys
export function unwrap<T>(response: { data: Record<string, unknown> }): T {
  const body = response.data;
  const success = body.Success ?? body.success;
  if (!success) {
    const errors = (body.Errors ?? body.errors) as string[] | null | undefined;
    const message = (body.Message ?? body.message) as string | undefined;
    const msg = (Array.isArray(errors) && errors.length > 0)
      ? errors.join('\n')
      : message || 'Xəta baş verdi';
    throw new Error(msg);
  }
  return (body.Data ?? body.data) as T;
}

// Request interceptor: attach JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('kg_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const silent = isSilentErrorRequest(error);

    if (!error.response) {
      if (!silent) {
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        toast.error(isTimeout
          ? 'Sorğu çox uzun sürdü. Yenidən cəhd edin.'
          : 'Bağlantı xətası. İnternet bağlantınızı yoxlayın.'
        );
      }
      return Promise.reject(new Error(error.code === 'ECONNABORTED' ? 'Timeout xətası' : 'Bağlantı xətası'));
    }

    const status = error.response.status;

    if (status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('kg_token');
        localStorage.removeItem('kg_user');
        window.location.href = '/login';
        return Promise.reject(new Error('Unauthorized'));
      }
      // On the login page, fall through so the real error message is extracted below
    }

    // Extract meaningful error message - handles both capitalized and lowercase keys
    const body = error.response.data as Record<string, unknown> | null;
    let message = 'Xəta baş verdi';

    if (body) {
      const errors  = body.Errors  ?? body.errors;
      const msg     = body.Message ?? body.message;
      const title   = body.title;

      // .NET ProblemDetails: errors is an object { Field: ["msg"] }
      if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
        const allMessages = Object.values(errors as Record<string, string[]>)
          .flat()
          .filter(Boolean);
        if (allMessages.length > 0) {
          message = allMessages.join('\n');
        } else if (typeof title === 'string') {
          message = title;
        }
      }
      // Standard envelope: Errors / errors is string[]
      else if (Array.isArray(errors) && (errors as string[]).length > 0) {
        message = (errors as string[]).join('\n');
      } else if (typeof msg === 'string' && msg) {
        message = msg;
      } else if (typeof title === 'string' && title) {
        message = title;
      }
    }

    if (status >= 500 && !silent) {
      toast.error('Server xətası. Bir az sonra yenidən cəhd edin.');
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
