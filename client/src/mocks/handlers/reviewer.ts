import { http } from 'msw/http';

import { ApiResponseError } from '@/lib/apiError';
import { reviewerApi } from '@/mocks/reviewerApi';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';
import type {
  IGradeSubmissionPayload,
  IRevisionRequestPayload,
  TReviewDraftPayload,
} from '@/types';

// Kontrak endpoint portal reviewer. Backend Go wajib mengikuti path dan bentuk respons ini.
// Semua endpoint khusus peran reviewer (403 untuk peran lain) dan hanya untuk case yang ditugaskan.

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

export const reviewerHandlers = [
  // { pending, history }: antrean urut tenggat SLA terdekat, riwayat urut keputusan terbaru.
  http.get(apiPath('/reviewer/queue'), async () => {
    await networkDelay();
    return run(() => reviewerApi.getQueue());
  }),

  // Isi submission, brief, rubrik, dan catatan revisi terakhir. Kandidat anonim.
  http.get(apiPath('/reviewer/submissions/:id'), async ({ params }) => {
    await networkDelay();
    try {
      const detail = reviewerApi.getSubmission(String(params.id));
      return detail ? ok(detail) : fail(404, 'Submission tidak ditemukan di antreanmu.');
    } catch (error) {
      return toFailure(error);
    }
  }),

  // Body: TReviewDraftPayload ({ decision?, grade?, revision? }). Bagian yang dikirim menimpa
  // bagian yang sama; draft hanya untuk reviewer dan dihapus saat keputusan dikirim.
  http.put(apiPath('/reviewer/submissions/:id/draft'), async ({ params, request }) => {
    await networkDelay();
    const payload = (await request.json()) as TReviewDraftPayload;
    return run(() => reviewerApi.saveDraft(String(params.id), payload));
  }),

  // Body: IGradeSubmissionPayload. Skor total dihitung server dari level × bobot rubrik.
  http.post(apiPath('/reviewer/submissions/:id/grade'), async ({ params, request }) => {
    await networkDelay();
    const payload = (await request.json()) as IGradeSubmissionPayload;
    return run(() => reviewerApi.grade(String(params.id), payload));
  }),

  // Body: { reason, note }. Maksimal 2 kali per submission (409 bila habis).
  http.post(apiPath('/reviewer/submissions/:id/revision'), async ({ params, request }) => {
    await networkDelay();
    const payload = (await request.json()) as IRevisionRequestPayload;
    return run(() => reviewerApi.requestRevision(String(params.id), payload));
  }),
];
