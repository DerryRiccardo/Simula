import { http } from 'msw/http';

import { ApiResponseError } from '@/lib/apiError';
import { authApi } from '@/mocks/authApi';
import { mockDb } from '@/mocks/db';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';
import type { ILoginPayload, IOnboardingPayload, IRegisterPayload } from '@/types';

// Kontrak endpoint auth. Backend Go wajib mengikuti path, payload, dan bentuk respons ini.
// Di produksi, sesi disimpan di cookie httpOnly; di mock, sesi disimpan di mockDb.

const run = <T>(action: () => T, message = 'OK', status = 200) => {
  try {
    return ok(action(), message, status);
  } catch (error) {
    if (error instanceof ApiResponseError) {
      return fail(error.status, error.message, error.errors);
    }
    return fail(400, error instanceof Error ? error.message : 'Permintaan gagal.');
  }
};

export const authHandlers = [
  http.post(apiPath('/auth/login'), async ({ request }) => {
    await networkDelay();
    const payload = (await request.json()) as ILoginPayload;
    return run(() => authApi.login(payload), 'Berhasil masuk.');
  }),

  http.post(apiPath('/auth/register'), async ({ request }) => {
    await networkDelay();
    const payload = (await request.json()) as IRegisterPayload;
    return run(() => authApi.register(payload), 'Akun berhasil dibuat.', 201);
  }),

  // Simulasi Google OAuth: langsung masuk sebagai akun Google tiruan.
  http.post(apiPath('/auth/google'), async () => {
    await networkDelay();
    return run(() => authApi.loginWithGoogle(), 'Berhasil masuk dengan Google.');
  }),

  http.post(apiPath('/auth/logout'), async () => {
    await networkDelay();
    return run(() => authApi.logout(), 'Berhasil keluar.');
  }),

  http.post(apiPath('/auth/refresh'), async () => {
    const user = mockDb.getSessionUser();
    return user ? ok(null) : fail(401, 'Sesi berakhir.');
  }),

  http.get(apiPath('/auth/me'), async () => {
    await networkDelay();
    return run(() => authApi.me());
  }),

  http.patch(apiPath('/users/me/onboarding'), async ({ request }) => {
    await networkDelay();
    const payload = (await request.json()) as IOnboardingPayload;
    return run(() => authApi.completeOnboarding(payload), 'Profil tersimpan.');
  }),
];
