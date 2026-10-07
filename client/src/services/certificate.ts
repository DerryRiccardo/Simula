import axios from 'axios';

import api from './api';
import { env } from '@/lib/env';
import type { IApiResponse, ICertificateVerification } from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/result.ts.
const loadMockApi = async () => (await import('@/mocks/certificateApi')).certificateApi;

export const certificateService = {
  /** Publik, tanpa login. null jika ID tidak terdaftar (404). */
  verify: async (id: string): Promise<ICertificateVerification | null> => {
    if (env.isApiMocking) return (await loadMockApi()).verify(id);
    try {
      return (
        await api.get<IApiResponse<ICertificateVerification>>(
          `/certificates/${encodeURIComponent(id)}`
        )
      ).data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
};
