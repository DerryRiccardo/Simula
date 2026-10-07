import { http } from 'msw/http';

import { mockDb } from '@/mocks/db';
import { resultApi } from '@/mocks/resultApi';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';

// Kontrak endpoint halaman hasil. Backend Go wajib mengikuti path dan bentuk respons ini.

const requireSession = () => (mockDb.getSessionUser() ? null : fail(401, 'Belum masuk.'));

const run = <T>(action: () => T) => {
  try {
    return ok(action());
  } catch (error) {
    return fail(400, error instanceof Error ? error.message : 'Permintaan gagal.');
  }
};

export const resultHandlers = [
  http.get(apiPath('/cases/:slug/result'), async ({ params }) => {
    await networkDelay();
    const result = resultApi.getResult(String(params.slug));
    return requireSession() ?? (result ? ok(result) : fail(404, 'Case tidak ditemukan.'));
  }),

  // Body: { isGranted: boolean }. Hanya bila reviewer merekomendasikan ke daftar prioritas.
  http.post(apiPath('/me/enrollments/:id/share-consent'), async ({ params, request }) => {
    await networkDelay();
    const { isGranted } = (await request.json()) as { isGranted: boolean };
    return requireSession() ?? run(() => resultApi.setShareConsent(String(params.id), isGranted));
  }),

  // Belum lulus → "Sedang dikerjakan" lagi. AI tanpa batas, B2B maksimal sekali.
  http.post(apiPath('/me/enrollments/:id/retry'), async ({ params }) => {
    await networkDelay();
    return requireSession() ?? run(() => resultApi.retry(String(params.id)));
  }),
];
