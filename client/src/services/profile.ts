import api from './api';
import { env } from '@/lib/env';
import type {
  IApiResponse,
  IProfile,
  IProfileDetailsPayload,
  TNotificationPreferences,
  TShareDefault,
} from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/result.ts.
const loadMockApi = async () => (await import('@/mocks/profileApi')).profileApi;

export const profileService = {
  get: async () => {
    if (env.isApiMocking) return (await loadMockApi()).getProfile();
    return (await api.get<IApiResponse<IProfile>>('/users/me/profile')).data.data;
  },
  updateDetails: async (payload: IProfileDetailsPayload) => {
    if (env.isApiMocking) return (await loadMockApi()).updateDetails(payload);
    return (await api.patch<IApiResponse<IProfile>>('/users/me/profile', payload)).data.data;
  },
  updateNotifications: async (notifications: TNotificationPreferences) => {
    if (env.isApiMocking) return (await loadMockApi()).updateNotifications(notifications);
    return (await api.put<IApiResponse<IProfile>>('/users/me/notifications', notifications)).data
      .data;
  },
  updateShareDefault: async (shareDefault: TShareDefault) => {
    if (env.isApiMocking) return (await loadMockApi()).updateShareDefault(shareDefault);
    return (await api.put<IApiResponse<IProfile>>('/users/me/data-sharing', { shareDefault })).data
      .data;
  },
};
