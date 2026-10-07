import { http } from 'msw/http';

import { mockDb } from '@/mocks/db';
import { reviewStatusApi } from '@/mocks/reviewStatusApi';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';
import type { TReviewSimulation } from '@/types';

// Kontrak endpoint halaman status. Backend Go wajib mengikuti path dan bentuk respons ini.

const requireSession = () => (mockDb.getSessionUser() ? null : fail(401, 'Belum masuk.'));

export const reviewStatusHandlers = [
  http.get(apiPath('/cases/:slug/status'), async ({ params }) => {
    await networkDelay();
    const status = reviewStatusApi.getStatus(String(params.slug));
    return requireSession() ?? (status ? ok(status) : fail(404, 'Case tidak ditemukan.'));
  }),

  // Prototype saja. Body: { outcome: 'revision' }.
  http.post(apiPath('/me/enrollments/:id/simulate-review'), async ({ params, request }) => {
    await networkDelay();
    const { outcome } = (await request.json()) as { outcome: TReviewSimulation };
    try {
      return requireSession() ?? ok(reviewStatusApi.simulateReview(String(params.id), outcome));
    } catch (error) {
      return fail(400, error instanceof Error ? error.message : 'Permintaan gagal.');
    }
  }),
];
