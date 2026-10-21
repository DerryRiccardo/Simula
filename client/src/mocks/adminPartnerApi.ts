import { differenceInBusinessDays } from 'date-fns';

import { ApiResponseError } from '@/lib/apiError';
import { listAllCases } from '@/mocks/adminCaseStore';
import { requireAdmin } from '@/mocks/adminGuard';
import { toReviewItem } from '@/mocks/adminReviewApi';
import { mockDb } from '@/mocks/db';
import {
  countPendingReviews,
  getCasePartnerId,
  getCaseReviewerIds,
  isActiveReviewer,
} from '@/mocks/reviewerAssignments';
import type {
  IAdminPartner,
  IAdminPartnerCase,
  IAdminPartnerDirectory,
  IAdminPartnerInput,
  IAdminReviewer,
  IAdminReviewerAssignmentPayload,
  IAdminReviewerInput,
  IAdminReviewItem,
  IAdminReviewerStatusPayload,
  IFieldError,
  IPartner,
} from '@/types';

// Menu Reviewer & Mitra panel admin untuk mode mock (CONTEXT.md 4.13). Digabung ke adminApi.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getB2bCases(): IAdminPartnerCase[] {
  return listAllCases()
    .filter((item) => item.tier === 'b2b')
    .map((item) => ({
      id: item.id,
      title: item.title,
      fieldKey: item.fieldKey,
      partnerId: getCasePartnerId(item.id),
      status: item.status,
      price: item.price,
      pendingReviewCount: mockDb
        .listAllEnrollments()
        .filter((record) => record.caseId === item.id && record.status === 'in_review').length,
      activeReviewerCount: getCaseReviewerIds(item.id).filter(isActiveReviewer).length,
    }));
}

const average = (values: number[]) =>
  values.length > 0
    ? Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10
    : null;

function toReviewer(userId: string, items: IAdminReviewItem[]): IAdminReviewer | null {
  const user = mockDb.findUserById(userId);
  const profile = user?.reviewerProfile;
  if (!user || !profile) return null;
  const decided = items.filter(
    (item) => item.reviewerId === user.id && item.decidedAt && item.status !== 'in_review'
  );
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    partnerId: profile.partnerId,
    partnerName: mockDb.listPartners().find((item) => item.id === profile.partnerId)?.name ?? '-',
    jobTitle: profile.jobTitle,
    isActive: profile.isActive,
    caseIds: mockDb
      .listReviewerAssignments()
      .filter((item) => item.reviewerId === user.id)
      .map((item) => item.caseId),
    pendingCount: countPendingReviews(user.id),
    decidedCount: decided.length,
    averageReviewDays: average(
      decided.map((item) =>
        Math.max(
          0,
          differenceInBusinessDays(new Date(item.decidedAt ?? ''), new Date(item.submittedAt))
        )
      )
    ),
  };
}

function getDirectory(): IAdminPartnerDirectory {
  const items = mockDb.listAllEnrollments().flatMap((record) => toReviewItem(record) ?? []);
  const cases = getB2bCases();
  const reviewers = mockDb
    .listAllUsers()
    .filter((user) => user.role === 'reviewer')
    .flatMap((user) => toReviewer(user.id, items) ?? [])
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const partners: IAdminPartner[] = mockDb.listPartners().map((partner) => {
    const caseIds = cases.filter((item) => item.partnerId === partner.id).map((item) => item.id);
    return {
      ...partner,
      caseCount: caseIds.length,
      activeReviewerCount: reviewers.filter(
        (reviewer) => reviewer.partnerId === partner.id && reviewer.isActive
      ).length,
      pendingReviewCount: items.filter(
        (item) => item.status === 'in_review' && caseIds.includes(item.caseId)
      ).length,
    };
  });
  return { partners, reviewers, cases };
}

function requireText(errors: IFieldError[], field: string, value: string, min: number) {
  if (value.trim().length < min) errors.push({ field, message: `Tulis minimal ${min} karakter.` });
}

function throwIfInvalid(errors: IFieldError[]) {
  if (errors.length > 0) throw new ApiResponseError(422, errors[0].message, errors);
}

function validatePartner(input: IAdminPartnerInput, currentId: string | null) {
  const errors: IFieldError[] = [];
  requireText(errors, 'name', input.name, 2);
  requireText(errors, 'industry', input.industry, 2);
  requireText(errors, 'about', input.about, 20);
  const name = input.name.trim().toLowerCase();
  if (
    mockDb.listPartners().some((item) => item.id !== currentId && item.name.toLowerCase() === name)
  ) {
    errors.push({ field: 'name', message: 'Mitra dengan nama ini sudah ada.' });
  }
  throwIfInvalid(errors);
}

function requireReviewerRecord(id: string) {
  requireAdmin();
  const user = mockDb.findUserById(id);
  if (!user?.reviewerProfile) throw new ApiResponseError(404, 'Reviewer tidak ditemukan.');
  return { user, profile: user.reviewerProfile };
}

export const adminPartnerApi = {
  getDirectory: (): IAdminPartnerDirectory => {
    requireAdmin();
    return getDirectory();
  },

  createPartner: (input: IAdminPartnerInput): IPartner => {
    requireAdmin();
    validatePartner(input, null);
    return mockDb.savePartner({
      id: `p-${crypto.randomUUID().slice(0, 8)}`,
      name: input.name.trim(),
      industry: input.industry.trim(),
      about: input.about.trim(),
    });
  },

  updatePartner: (id: string, input: IAdminPartnerInput): IPartner => {
    requireAdmin();
    if (!mockDb.listPartners().some((item) => item.id === id)) {
      throw new ApiResponseError(404, 'Mitra tidak ditemukan.');
    }
    validatePartner(input, id);
    return mockDb.savePartner({
      id,
      name: input.name.trim(),
      industry: input.industry.trim(),
      about: input.about.trim(),
    });
  },

  /** Di produksi: membuat akun reviewer dan mengirim email undangan untuk mengatur password. */
  createReviewer: (input: IAdminReviewerInput): IAdminReviewer => {
    requireAdmin();
    const errors: IFieldError[] = [];
    requireText(errors, 'name', input.name, 3);
    requireText(errors, 'jobTitle', input.jobTitle, 3);
    if (!EMAIL_PATTERN.test(input.email.trim())) {
      errors.push({ field: 'email', message: 'Format email tidak valid.' });
    } else if (mockDb.findUserByEmail(input.email.trim())) {
      errors.push({ field: 'email', message: 'Email ini sudah terdaftar.' });
    }
    if (!mockDb.listPartners().some((item) => item.id === input.partnerId)) {
      errors.push({ field: 'partnerId', message: 'Pilih mitra.' });
    }
    throwIfInvalid(errors);
    const user = mockDb.createReviewer({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      partnerId: input.partnerId,
      jobTitle: input.jobTitle.trim(),
      isActive: true,
    });
    const reviewer = toReviewer(user.id, []);
    if (!reviewer) throw new ApiResponseError(500, 'Reviewer gagal dibuat.');
    return reviewer;
  },

  /**
   * Atur case yang ditugaskan: hanya B2B case milik mitra reviewer. Case yang masih punya
   * submission menunggu di tangan reviewer ini tidak bisa dilepas sebelum dipindahkan.
   */
  setReviewerCases: (id: string, { caseIds }: IAdminReviewerAssignmentPayload): IAdminReviewer => {
    const { user, profile } = requireReviewerRecord(id);
    const allowed = getB2bCases().filter((item) => item.partnerId === profile.partnerId);
    if (caseIds.some((caseId) => !allowed.some((item) => item.id === caseId))) {
      throw new ApiResponseError(422, 'Reviewer hanya bisa ditugaskan ke case milik mitranya.');
    }
    const items = mockDb.listAllEnrollments().flatMap((record) => toReviewItem(record) ?? []);
    const blocked = items.filter(
      (item) =>
        item.status === 'in_review' && item.reviewerId === user.id && !caseIds.includes(item.caseId)
    );
    if (blocked.length > 0) {
      throw new ApiResponseError(
        409,
        `${blocked.length} submission di case yang dilepas masih menunggu reviewer ini. Pindahkan dulu lewat Ganti reviewer.`
      );
    }
    mockDb.setReviewerCases(user.id, [...new Set(caseIds)]);
    const reviewer = toReviewer(user.id, items);
    if (!reviewer) throw new ApiResponseError(404, 'Reviewer tidak ditemukan.');
    return reviewer;
  },

  /** Nonaktifkan: reviewer tidak lagi menerima submission baru. Diblokir bila masih ada antrean. */
  setReviewerStatus: (id: string, { isActive }: IAdminReviewerStatusPayload): IAdminReviewer => {
    const { user } = requireReviewerRecord(id);
    const pending = countPendingReviews(user.id);
    if (!isActive && pending > 0) {
      throw new ApiResponseError(
        409,
        `Masih ada ${pending} submission menunggu reviewer ini. Pindahkan dulu lewat Ganti reviewer.`
      );
    }
    mockDb.updateReviewerProfile(user.id, { isActive });
    const items = mockDb.listAllEnrollments().flatMap((record) => toReviewItem(record) ?? []);
    const reviewer = toReviewer(user.id, items);
    if (!reviewer) throw new ApiResponseError(404, 'Reviewer tidak ditemukan.');
    return reviewer;
  },
};
