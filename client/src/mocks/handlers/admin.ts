import { http } from 'msw/http';

import { ApiResponseError } from '@/lib/apiError';
import { adminApi } from '@/mocks/adminApi';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';
import type {
  IAdminCaseSavePayload,
  IAdminFieldInput,
  IAdminFlagPayload,
  IPlatformSettings,
  IAdminPartnerInput,
  IAdminReassignPayload,
  IAdminReviewerAssignmentPayload,
  IAdminReviewerInput,
  IAdminReviewerStatusPayload,
} from '@/types';

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
  // Ringkasan Dashboard admin: angka utama, butir "Perlu tindakan", dan aktivitas terbaru.
  http.get(apiPath('/admin/overview'), async () => {
    await networkDelay();
    return run(() => adminApi.getOverview());
  }),

  // Penilaian AI dan B2B: daftar semua submission yang sudah sampai tahap penilaian.
  http.get(apiPath('/admin/reviews'), async () => {
    await networkDelay();
    return run(() => adminApi.listReviews());
  }),

  http.get(apiPath('/admin/reviews/:id'), async ({ params }) => {
    await networkDelay();
    try {
      const detail = adminApi.getReview(String(params.id));
      return detail ? ok(detail) : fail(404, 'Penilaian tidak ditemukan.');
    } catch (error) {
      return toFailure(error);
    }
  }),

  // AI case: jalankan ulang penilaian. 409 bila belum selesai dinilai.
  http.post(apiPath('/admin/reviews/:id/regrade'), async ({ params }) => {
    await networkDelay();
    return run(() => adminApi.regrade(String(params.id)));
  }),

  // Body: IAdminFlagPayload ({ isFlagged, note }). Catatan internal admin.
  http.put(apiPath('/admin/reviews/:id/flag'), async ({ params, request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminFlagPayload;
    return run(() => adminApi.setFlag(String(params.id), payload));
  }),

  // B2B: pengingat ke reviewer. 409 bila sudah dikirim dalam 24 jam terakhir.
  http.post(apiPath('/admin/reviews/:id/remind'), async ({ params }) => {
    await networkDelay();
    return run(() => adminApi.remindReviewer(String(params.id)));
  }),

  // B2B: pindahkan submission ke reviewer aktif lain dari mitra yang sama.
  // Body: IAdminReassignPayload ({ reviewerId }).
  http.post(apiPath('/admin/reviews/:id/reassign'), async ({ params, request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminReassignPayload;
    return run(() => adminApi.reassignReviewer(String(params.id), payload));
  }),

  // Reviewer & Mitra: mitra, reviewer, dan B2B case sebagai pilihan penugasan.
  http.get(apiPath('/admin/partners'), async () => {
    await networkDelay();
    return run(() => adminApi.getDirectory());
  }),

  // Body: IAdminPartnerInput ({ name, industry, about }).
  http.post(apiPath('/admin/partners'), async ({ request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminPartnerInput;
    return run(() => adminApi.createPartner(payload));
  }),

  // Body: IAdminPartnerInput. Nama dikunci (409) bila mitra sudah punya case.
  http.put(apiPath('/admin/partners/:id'), async ({ params, request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminPartnerInput;
    return run(() => adminApi.updatePartner(String(params.id), payload));
  }),

  // Body: IAdminReviewerInput. Backend membuat akun dan mengirim email undangan.
  http.post(apiPath('/admin/reviewers'), async ({ request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminReviewerInput;
    return run(() => adminApi.createReviewer(payload));
  }),

  // Body: IAdminReviewerAssignmentPayload ({ caseIds }), daftar lengkap pengganti yang lama.
  http.put(apiPath('/admin/reviewers/:id/assignments'), async ({ params, request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminReviewerAssignmentPayload;
    return run(() => adminApi.setReviewerCases(String(params.id), payload));
  }),

  // Body: IAdminReviewerStatusPayload ({ isActive }). 409 bila masih ada antrean.
  http.put(apiPath('/admin/reviewers/:id/status'), async ({ params, request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminReviewerStatusPayload;
    return run(() => adminApi.setReviewerStatus(String(params.id), payload));
  }),

  // Member: mahasiswa terdaftar beserta ringkasan aktivitasnya.
  http.get(apiPath('/admin/members'), async () => {
    await networkDelay();
    return run(() => adminApi.listMembers());
  }),

  http.get(apiPath('/admin/members/:id'), async ({ params }) => {
    await networkDelay();
    try {
      const detail = adminApi.getMember(String(params.id));
      return detail ? ok(detail) : fail(404, 'Member tidak ditemukan.');
    } catch (error) {
      return toFailure(error);
    }
  }),

  // Order: transaksi payment gateway, baca saja. Status mengikuti callback gateway.
  http.get(apiPath('/admin/orders'), async () => {
    await networkDelay();
    return run(() => adminApi.listOrders());
  }),

  // Talent pool: kandidat yang direkomendasikan reviewer. Teruskan hanya bila sudah disetujui.
  http.get(apiPath('/admin/talent-pool'), async () => {
    await networkDelay();
    return run(() => adminApi.listTalentPool());
  }),

  http.post(apiPath('/admin/talent-pool/:id/share'), async ({ params }) => {
    await networkDelay();
    return run(() => adminApi.shareTalent(String(params.id)));
  }),

  // Bidang studi: data master untuk onboarding, filter katalog, dan pembuat case.
  http.get(apiPath('/admin/fields'), async () => {
    await networkDelay();
    return run(() => adminApi.listFields());
  }),

  // Body: IAdminFieldInput ({ label, description }). Key dibuat dari label.
  http.post(apiPath('/admin/fields'), async ({ request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminFieldInput;
    return run(() => adminApi.createField(payload));
  }),

  http.put(apiPath('/admin/fields/:key'), async ({ params, request }) => {
    await networkDelay();
    const payload = (await request.json()) as IAdminFieldInput;
    return run(() => adminApi.updateField(String(params.key), payload));
  }),

  // Body: { isActive: boolean }. 409 bila menonaktifkan bidang aktif terakhir.
  http.put(apiPath('/admin/fields/:key/status'), async ({ params, request }) => {
    await networkDelay();
    const { isActive } = (await request.json()) as { isActive: boolean };
    return run(() => adminApi.setFieldActive(String(params.key), isActive));
  }),

  // Body: { direction: -1 | 1 }. Menukar urutan dengan bidang di sebelahnya.
  http.post(apiPath('/admin/fields/:key/move'), async ({ params, request }) => {
    await networkDelay();
    const { direction } = (await request.json()) as { direction: -1 | 1 };
    return run(() => adminApi.moveField(String(params.key), direction));
  }),

  // Pengaturan platform; setiap perubahan dicatat (siapa, kapan, nilai lama dan baru).
  http.get(apiPath('/admin/settings'), async () => {
    await networkDelay();
    return run(() => adminApi.getSettings());
  }),

  // Body: IPlatformSettings (semua nilai). 409 bila tidak ada yang berubah.
  http.put(apiPath('/admin/settings'), async ({ request }) => {
    await networkDelay();
    const payload = (await request.json()) as IPlatformSettings;
    return run(() => adminApi.saveSettings(payload));
  }),

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
