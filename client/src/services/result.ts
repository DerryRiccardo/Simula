import axios from 'axios';

import api from './api';
import { env } from '@/lib/env';
import type { IApiResponse, ICaseResult, IEnrollment, TShareConsent } from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/reviewStatus.ts.
const loadMockApi = async () => (await import('@/mocks/resultApi')).resultApi;

export const resultService = {
  /** null jika case tidak ditemukan (404). */
  get: async (slug: string): Promise<ICaseResult | null> => {
    if (env.isApiMocking) return (await loadMockApi()).getResult(slug);
    try {
      return (await api.get<IApiResponse<ICaseResult>>(`/cases/${encodeURIComponent(slug)}/result`))
        .data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  setShareConsent: async ({ enrollmentId, isGranted }: IShareConsentPayload) => {
    if (env.isApiMocking) return (await loadMockApi()).setShareConsent(enrollmentId, isGranted);
    return (
      await api.post<IApiResponse<TShareConsent>>(`/me/enrollments/${enrollmentId}/share-consent`, {
        isGranted,
      })
    ).data.data;
  },
  retry: async (enrollmentId: string) => {
    if (env.isApiMocking) return (await loadMockApi()).retry(enrollmentId);
    return (await api.post<IApiResponse<IEnrollment>>(`/me/enrollments/${enrollmentId}/retry`)).data
      .data;
  },
};

export interface IShareConsentPayload {
  enrollmentId: string;
  isGranted: boolean;
}
