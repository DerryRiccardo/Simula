import api from './api';
import { env } from '@/lib/env';
import type {
  IApiResponse,
  ILoginPayload,
  IOnboardingPayload,
  IRegisterPayload,
  IUser,
} from '@/types';

// Mode mock: dipanggil langsung seperti service lain, tidak lewat service worker MSW. Service
// worker bisa dihentikan browser saat tab lama tidak aktif, dan request auth lalu gagal (404).
const loadMockApi = async () => (await import('@/mocks/authApi')).authApi;

export const authService = {
  login: async (payload: ILoginPayload) => {
    if (env.isApiMocking) return (await loadMockApi()).login(payload);
    return (await api.post<IApiResponse<IUser>>('/auth/login', payload)).data.data;
  },
  register: async (payload: IRegisterPayload) => {
    if (env.isApiMocking) return (await loadMockApi()).register(payload);
    return (await api.post<IApiResponse<IUser>>('/auth/register', payload)).data.data;
  },
  loginWithGoogle: async () => {
    if (env.isApiMocking) return (await loadMockApi()).loginWithGoogle();
    return (await api.post<IApiResponse<IUser>>('/auth/google')).data.data;
  },
  logout: async () => {
    if (env.isApiMocking) return (await loadMockApi()).logout();
    await api.post('/auth/logout');
    return null;
  },
  me: async () => {
    if (env.isApiMocking) return (await loadMockApi()).me();
    return (await api.get<IApiResponse<IUser>>('/auth/me')).data.data;
  },
  completeOnboarding: async (payload: IOnboardingPayload) => {
    if (env.isApiMocking) return (await loadMockApi()).completeOnboarding(payload);
    return (await api.patch<IApiResponse<IUser>>('/users/me/onboarding', payload)).data.data;
  },
};
