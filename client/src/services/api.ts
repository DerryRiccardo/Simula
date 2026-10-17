import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { env } from '@/lib/env';
import { PATHS } from '@/constants/paths';

// Sesi memakai cookie httpOnly dari backend, jadi tidak ada token yang disimpan di client.
const api = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

// 401 → refresh sesi sekali; request lain yang gagal selama refresh masuk antrean lalu diulang.
// Endpoint auth tidak memicu refresh. /auth/me (cek sesi) memicu refresh karena access token
// berumur pendek, tetapi bila refresh gagal tidak diarahkan ke login: tamu boleh membuka halaman
// publik.
const NO_REFRESH_URL = /\/auth\/(login|register|google|refresh|logout)/;
const SESSION_CHECK_URL = /\/auth\/me$/;

let isRefreshing = false;
let queue: { resolve: () => void; reject: (e: unknown) => void }[] = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? '';
    if (
      !original ||
      error.response?.status !== 401 ||
      original._retry ||
      NO_REFRESH_URL.test(url)
    ) {
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
      if (!SESSION_CHECK_URL.test(url) && window.location.pathname !== PATHS.login) {
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
