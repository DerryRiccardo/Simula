import { http } from 'msw/http';

import { mockDb } from '@/mocks/db';
import { learningApi } from '@/mocks/learningApi';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';
import type { TCaseLevel, TCaseSort, TEnrollmentSort, TEnrollmentStatus, TTier } from '@/types';

// Kontrak endpoint katalog & pembelajaran. Backend Go wajib mengikuti path, query, dan bentuk
// respons ini. Logika datanya ada di learningApi (dipakai bersama oleh service saat mode mock).

const getParam = <T extends string>(params: URLSearchParams, key: string) =>
  (params.get(key) || undefined) as T | undefined;

const requireSession = () => (mockDb.getSessionUser() ? null : fail(401, 'Belum masuk.'));

export const learningHandlers = [
  http.get(apiPath('/cases'), async ({ request }) => {
    await networkDelay();
    const params = new URL(request.url).searchParams;
    return ok(
      learningApi.listCases({
        tier: getParam<TTier>(params, 'tier'),
        field: getParam(params, 'field'),
        level: getParam<TCaseLevel>(params, 'level'),
        sort: getParam<TCaseSort>(params, 'sort'),
        search: getParam(params, 'search'),
        page: Number(params.get('page') ?? 1),
        limit: Number(params.get('limit') ?? 12),
      })
    );
  }),

  http.get(apiPath('/cases/:slug'), async ({ params }) => {
    await networkDelay();
    const detail = learningApi.getCaseBySlug(String(params.slug));
    return detail ? ok(detail) : fail(404, 'Case tidak ditemukan.');
  }),

  // Body: { caseId }. Hanya untuk AI case; B2B dibuat lewat checkout.
  http.post(apiPath('/me/enrollments'), async ({ request }) => {
    await networkDelay();
    const unauthorized = requireSession();
    if (unauthorized) return unauthorized;
    const { caseId } = (await request.json()) as { caseId: string };
    try {
      return ok(learningApi.startCase(caseId), 'Case dimulai.', 201);
    } catch (error) {
      return fail(400, error instanceof Error ? error.message : 'Gagal memulai case.');
    }
  }),

  http.get(apiPath('/me/enrollments'), async ({ request }) => {
    await networkDelay();
    const params = new URL(request.url).searchParams;
    return (
      requireSession() ??
      ok(
        learningApi.listEnrollments({
          tier: getParam<TTier>(params, 'tier'),
          status: getParam<TEnrollmentStatus>(params, 'status'),
          field: getParam(params, 'field'),
          search: getParam(params, 'search'),
          sort: getParam<TEnrollmentSort>(params, 'sort'),
        })
      )
    );
  }),

  http.get(apiPath('/me/certificates'), async ({ request }) => {
    await networkDelay();
    const params = new URL(request.url).searchParams;
    return (
      requireSession() ??
      ok(learningApi.listCertificates({ tier: getParam<TTier>(params, 'tier') }))
    );
  }),

  http.get(apiPath('/me/dashboard'), async () => {
    await networkDelay();
    return requireSession() ?? ok(learningApi.getDashboard());
  }),
];
