import axios from 'axios';

import api from './api';
import { env } from '@/lib/env';
import type { IAdminCase, IAdminCaseSavePayload, IAdminCaseSummary, IApiResponse } from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/reviewer.ts.
const loadMockApi = async () => (await import('@/mocks/adminApi')).adminApi;

export const adminService = {
  listCases: async () => {
    if (env.isApiMocking) return (await loadMockApi()).listCases();
    return (await api.get<IApiResponse<IAdminCaseSummary[]>>('/admin/cases')).data.data;
  },
  /** null jika case tidak ditemukan (404). */
  getCase: async (id: string): Promise<IAdminCase | null> => {
    if (env.isApiMocking) return (await loadMockApi()).getCase(id);
    try {
      return (await api.get<IApiResponse<IAdminCase>>(`/admin/cases/${encodeURIComponent(id)}`))
        .data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  /** id null = buat case baru. */
  saveCase: async ({ id, payload }: { id: string | null; payload: IAdminCaseSavePayload }) => {
    if (env.isApiMocking) return (await loadMockApi()).saveCase(id, payload);
    const response = id
      ? await api.put<IApiResponse<IAdminCase>>(`/admin/cases/${encodeURIComponent(id)}`, payload)
      : await api.post<IApiResponse<IAdminCase>>('/admin/cases', payload);
    return response.data.data;
  },
};
