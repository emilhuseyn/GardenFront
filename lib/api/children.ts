import apiClient, { unwrap } from './client';
import type { Child, ChildFormData, PaginatedResponse, ChildFilters } from '@/types';

type ChildUpdateData = Partial<ChildFormData> & {
  registrationDate?: string;
  deactivationDate?: string | null;
};

/** Deaktivləşdirmədə sıfırlanmayıb keçilən (real ödənişi olan) ay — geri qaytarma əl ilə edilməlidir. */
export interface SkippedPaidMonth {
  paymentId: number;
  month: number;
  year: number;
  paidAmount: number;
}

/**
 * BAĞLANMIŞ qeydiyyat epizodunda yekunlaşdırıldığı üçün sıfırlanmayan ay (G2). Sətir QƏSDƏN
 * toxunulmaz qalır — ştab isə onun yenidən hesablanmadığını GÖRMƏLİDİR.
 */
export interface SkippedConfirmedMonth {
  paymentId: number;
  month: number;
  year: number;
  finalAmount: number;
  paidAmount: number;
}

/** Əvvəlki səhv çıxış tarixi ilə sıfırlanmış, indi yenidən hesablanan ay. */
export interface RestoredMonth {
  paymentId: number;
  month: number;
  year: number;
  finalAmount: number;
  /** Bərpa anındakı real ödəniş — 0-dan böyükdürsə ödənişi olan ay yenidən hesablanıb. */
  paidAmount?: number;
}

/** Çıxış ayının yenidən bölünməsi nəticəsində yaranan artıq ödəniş — geri qaytarma əl ilə edilməlidir. */
export interface ExitMonthOverpayment {
  paymentId: number;
  month: number;
  year: number;
  paidAmount: number;
  newFinalAmount: number;
  difference: number;
}

/**
 * Çıxış tarixi İRƏLİ düzəldildikdə yaranan az hesablanma (F5): sətir tam ödənildiyi üçün
 * məbləği yenidən yazılmır, fərq valideyndən əl ilə alınmalıdır.
 */
export interface ExitMonthUnderpayment {
  paymentId: number;
  month: number;
  year: number;
  paidAmount: number;
  newFinalAmount: number;
  difference: number;
}

/**
 * Bərpa pəncərəsində hesabı ÜMUMİYYƏTLƏ olmayan ay (F1). Backend belə ayı QƏSDƏN yaratmır —
 * "uşaq həmin ay gəlməyib" ilə "sətir sadəcə generasiya olunmayıb" bir-birindən seçilmir və
 * avtomatik yaratmaq valideynə uydurma borc yazardı. Ştab siyahını görür, lazım olsa əl ilə yaradır.
 */
export interface MissingMonth {
  month: number;
  year: number;
}

/** Çıxış ayının yekun vəziyyəti (F3) — hər deaktivasiyada qayıdır. */
export interface ExitMonthOutcome {
  paymentId: number;
  month: number;
  year: number;
  finalAmount: number;
  paidAmount: number;
  periodStartDay: number;
  periodEndDay: number;
  /** Sətir bu əməliyyatla YARADILDI (əvvəllər mövcud deyildi). */
  created: boolean;
  /** Məbləğə toxunulmadı (real ödəniş və ya təsdiqlənmiş yoxluq) — əl ilə yoxlanmalıdır. */
  needsManualReview: boolean;
  reason?: string | null;
}

/** Backend DeactivationRecalcResult — çıxış tarixindən sonra hesabların yenidən qurulmasının nəticəsi. */
export interface DeactivationRecalcResult {
  childId: number;
  childFullName: string;
  effectiveDate: string;
  zeroedMonths: number;
  skippedPaidMonths: SkippedPaidMonth[];
  /** Yekunlaşdırıldığı üçün sıfırlanmayan aylar — toxunulmur, yalnız bildirilir (G2). */
  skippedConfirmedMonths?: SkippedConfirmedMonth[];
  restoredMonths?: RestoredMonth[];
  restoredMonthsCount?: number;
  exitMonthOverpayment?: ExitMonthOverpayment | null;
  exitMonthUnderpayment?: ExitMonthUnderpayment | null;
  /** Hesabı olmayan aylar — yaradılmır, yalnız bildirilir (F1). */
  missingMonths?: MissingMonth[];
  /** Çıxış ayının nəticəsi (F3). */
  exitMonth?: ExitMonthOutcome | null;
}

/** Redaktə cavabı — çıxış tarixi dəyişdirilibsə hesabların yenidən qurulması da qayıdır (D4). */
export type ChildUpdateResponse = Child & { recalculation?: DeactivationRecalcResult | null };

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

  findByPersonId: async (personId: number) => {
    let page = 1;
    const pageSize = 200;

    while (true) {
      const data = await childrenApi.getAll({ page, pageSize }, { silentError: true });
      const found = data.items.find((child) => child.personId === personId);
      if (found) return found;
      if (!data.hasNextPage) return null;
      page += 1;
    }
  },

  create: async (data: ChildFormData) => {
    const res = await apiClient.post('/api/childrens', data);
    return unwrap<Child>(res);
  },

  update: async (id: number, data: ChildUpdateData) => {
    const res = await apiClient.put(`/api/childrens/${id}`, data);
    return unwrap<ChildUpdateResponse>(res);
  },

  activate: async (id: number) => {
    const res = await apiClient.patch(`/api/childrens/${id}/activate`);
    return unwrap(res);
  },

  // effectiveDate — uşağın gəldiyi SONUNCU gün ('yyyy-MM-dd'). Verilməsə gövdə göndərilmir
  // və backend köhnə davranışla bugünü götürür.
  deactivate: async (id: number, effectiveDate?: string) => {
    const res = await apiClient.patch(
      `/api/childrens/${id}/deactivate`,
      effectiveDate ? { effectiveDate: `${effectiveDate}T00:00:00Z` } : undefined
    );
    return unwrap<DeactivationRecalcResult>(res);
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

  downloadContract: async (id: number): Promise<{ blob: Blob; fileName: string }> => {
    const res = await apiClient.get(`/api/childrens/${id}/contract`, {
      responseType: 'blob',
      headers: {
        Accept: '*/*',
      },
    });

    const contentDisposition = (res.headers['content-disposition'] as string | undefined) ?? null;
    const fileName = extractFileName(contentDisposition) || `Kontrakt_${id}.doc`;
    return { blob: res.data as Blob, fileName };
  },
};
