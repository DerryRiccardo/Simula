import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/lib/env';
import { PATHS } from '@/constants/paths';

// Sesi memakai cookie httpOnly dari backend, jadi tidak ada token yang disimpan di client.
const api = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

// 401 → refresh sesi sekali; request lain yang gagal selama refresh masuk antrean lalu diulang.
// Endpoint auth (termasuk /auth/me untuk cek sesi) dikecualikan agar tidak memicu redirect.
let isRefreshing = false;
let queue: { resolve: () => void; reject: (e: unknown) => void }[] = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthUrl = /\/auth\/(login|register|google|refresh|logout|me)/.test(original?.url ?? '');
    if (!original || error.response?.status !== 401 || original._retry || isAuthUrl) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => queue.push({ resolve, reject })).then(() =>
        api(original)
      );
    }

    original._retry = true;
    isRefreshing = true;
    try {
      await api.post('/auth/refresh');
      queue.forEach((p) => p.resolve());
      return api(original);
    } catch (e) {
      queue.forEach((p) => p.reject(e));
      if (window.location.pathname !== PATHS.login) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        // Interceptor berjalan di luar komponen React, dan sesi yang habis memang perlu reload
        // penuh agar seluruh cache data pengguna sebelumnya ikut terbuang.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `${PATHS.login}?next=${next}`;
      }
      return Promise.reject(e);
    } finally {
      queue = [];
      isRefreshing = false;
    }
  }
);

export default api;
