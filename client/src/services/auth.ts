import api from './api';
import { env, shouldMockService } from '@/lib/env';
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

const isMocked = () => shouldMockService('auth');

// Mode campuran (auth memakai backend, layanan lain masih tiruan): data tiruan membaca pengguna
// dari sesi mockDb, jadi sesi tiruan disamakan dengan pengguna dari backend.
const withMockSession = async (user: IUser) => {
  if (env.isApiMocking) (await import('@/mocks/db')).mockDb.syncRealUser(user);
  return user;
};

export const authService = {
  login: async (payload: ILoginPayload) => {
    if (isMocked()) return (await loadMockApi()).login(payload);
    return withMockSession((await api.post<IApiResponse<IUser>>('/auth/login', payload)).data.data);
  },
  register: async (payload: IRegisterPayload) => {
    if (isMocked()) return (await loadMockApi()).register(payload);
    return withMockSession(
      (await api.post<IApiResponse<IUser>>('/auth/register', payload)).data.data
    );
  },
  /** Hanya mode mock. Dengan backend, login Google adalah redirect ke googleLoginUrl. */
  loginWithGoogle: async () => (await loadMockApi()).loginWithGoogle(),
  /** URL backend yang mengarahkan browser ke halaman login Google, lalu kembali ke `next`. */
  googleLoginUrl: (next: string | null) => {
    const query = next ? `?next=${encodeURIComponent(next)}` : '';
    return `${env.apiUrl}/auth/google${query}`;
  },
  logout: async () => {
    if (isMocked()) return (await loadMockApi()).logout();
    await api.post('/auth/logout');
    if (env.isApiMocking) (await import('@/mocks/db')).mockDb.setSession(null);
    return null;
  },
  me: async () => {
    if (isMocked()) return (await loadMockApi()).me();
    return withMockSession((await api.get<IApiResponse<IUser>>('/auth/me')).data.data);
  },
  completeOnboarding: async (payload: IOnboardingPayload) => {
    if (isMocked()) return (await loadMockApi()).completeOnboarding(payload);
    return withMockSession(
      (await api.patch<IApiResponse<IUser>>('/users/me/onboarding', payload)).data.data
    );
  },
};
