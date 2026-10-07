import { http } from 'msw/http';

import { mockDb } from '@/mocks/db';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';
import { workspaceApi } from '@/mocks/workspaceApi';
import type { ISubmissionContent } from '@/types';

// Kontrak endpoint halaman pengerjaan. Backend Go wajib mengikuti path dan bentuk respons ini.

const requireSession = () => (mockDb.getSessionUser() ? null : fail(401, 'Belum masuk.'));

const run = <T>(action: () => T, status = 200) => {
  try {
    return ok(action(), 'OK', status);
  } catch (error) {
    return fail(400, error instanceof Error ? error.message : 'Permintaan gagal.');
  }
};

export const workspaceHandlers = [
  http.get(apiPath('/cases/:slug/workspace'), async ({ params }) => {
    await networkDelay();
    const workspace = workspaceApi.getWorkspace(String(params.slug));
    return requireSession() ?? (workspace ? ok(workspace) : fail(404, 'Case tidak ditemukan.'));
  }),

  http.post(apiPath('/me/enrollments/:id/start'), async ({ params }) => {
    await networkDelay();
    return requireSession() ?? run(() => workspaceApi.startWork(String(params.id)));
  }),

  // Body: ISubmissionContent. Disimpan otomatis berkala dari halaman pengerjaan.
  http.put(apiPath('/me/enrollments/:id/draft'), async ({ params, request }) => {
    const content = (await request.json()) as ISubmissionContent;
    return requireSession() ?? run(() => workspaceApi.saveDraft(String(params.id), content));
  }),

  // Body: ISubmissionContent. B2B → in_review, AI → ai_grading.
  http.post(apiPath('/me/enrollments/:id/submit'), async ({ params, request }) => {
    await networkDelay();
    const content = (await request.json()) as ISubmissionContent;
    return requireSession() ?? run(() => workspaceApi.submitWork(String(params.id), content));
  }),
];
