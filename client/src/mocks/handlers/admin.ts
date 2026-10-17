import { http } from 'msw/http';

import { ApiResponseError } from '@/lib/apiError';
import { adminApi } from '@/mocks/adminApi';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';
import type { IAdminCaseSavePayload } from '@/types';

// Kontrak endpoint panel admin. Backend Go wajib mengikuti path dan bentuk respons ini.
// Semua endpoint khusus peran admin (403 untuk peran lain).

const toFailure = (error: unknown) =>
  error instanceof ApiResponseError
    ? fail(error.status, error.message, error.errors)
    : fail(400, error instanceof Error ? error.message : 'Permintaan gagal.');

const run = <T>(action: () => T) => {
  try {
    return ok(action());
  } catch (error) {
    return toFailure(error);
  }
};

export const adminHandlers = [
  http.get(apiPath('/admin/cases'), async () => {
    await networkDelay();
    return run(() => adminApi.listCases());
  }),

  http.get(apiPath('/admin/cases/:id'), async ({ params }) => {
    await networkDelay();
    try {
      const adminCase = adminApi.getCase(String(params.id));
      return adminCase ? ok(adminCase) : fail(404, 'Case tidak ditemukan.');
    } catch (error) {
      return toFailure(error);
    }
  }),

  // Body: IAdminCaseSavePayload ({ input, isPublish }). Case baru.
  http.post(apiPath('/admin/cases'), async ({ request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminCaseSavePayload;
    return run(() => adminApi.saveCase(null, payload));
  }),

  // Body: IAdminCaseSavePayload. Menimpa isi case; isPublish menentukan status draft/terbit.
  http.put(apiPath('/admin/cases/:id'), async ({ params, request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminCaseSavePayload;
    return run(() => adminApi.saveCase(String(params.id), payload));
  }),
];
