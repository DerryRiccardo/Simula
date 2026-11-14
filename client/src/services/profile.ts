import api from './api';
import { shouldMockService } from '@/lib/env';
import type { IApiResponse, IProfile, IProfileDetailsPayload, TShareDefault } from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/result.ts.
const loadMockApi = async () => (await import('@/mocks/profileApi')).profileApi;
const isMocked = () => shouldMockService('profile');

export const profileService = {
  get: async () => {
    if (isMocked()) return (await loadMockApi()).getProfile();
    return (await api.get<IApiResponse<IProfile>>('/users/me/profile')).data.data;
  },
  updateDetails: async (payload: IProfileDetailsPayload) => {
    if (isMocked()) return (await loadMockApi()).updateDetails(payload);
    return (await api.patch<IApiResponse<IProfile>>('/users/me/profile', payload)).data.data;
  },
  updateShareDefault: async (shareDefault: TShareDefault) => {
    if (isMocked()) return (await loadMockApi()).updateShareDefault(shareDefault);
    return (await api.put<IApiResponse<IProfile>>('/users/me/data-sharing', { shareDefault })).data
      .data;
  },
};
