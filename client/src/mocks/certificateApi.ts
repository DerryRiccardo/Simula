import { getCaseBrief } from '@/mocks/data/caseBriefs';
import { findCaseById } from '@/mocks/data/cases';
import { mockDb } from '@/mocks/db';
import { learningApi } from '@/mocks/learningApi';
import { getReviewerRole } from '@/mocks/resultApi';
import type { ICertificateVerification } from '@/types';

// Logika verifikasi sertifikat untuk mode mock. Publik: bisa dibuka tanpa masuk.

export const certificateApi = {
  /** null jika ID tidak terdaftar (sertifikat tidak valid). */
  verify: (certificateId: string): ICertificateVerification | null => {
    const record = mockDb.findEnrollmentByCertificateId(certificateId);
    if (!record?.certificateId || record.score === null || record.status !== 'passed') return null;
    const caseSummary = findCaseById(record.caseId);
    const detail = caseSummary ? learningApi.getCaseBySlug(caseSummary.slug) : null;
    const recipient = mockDb.findUserById(record.userId);
    if (!caseSummary || !detail || !recipient) return null;

    return {
      certificate: {
        id: record.certificateId,
        caseTitle: caseSummary.title,
        tier: caseSummary.tier,
        fieldKey: caseSummary.fieldKey,
        recipientName: recipient.name,
        partnerName: caseSummary.partnerName,
        score: record.score,
        issuedAt: record.issuedAt ?? record.updatedAt,
      },
      caseSlug: caseSummary.slug,
      skills: detail.skills,
      reviewerRole: getReviewerRole(detail),
      partner: detail.partner,
      passingScore: getCaseBrief(detail).passingScore,
      isOwner: mockDb.getSessionUser()?.id === record.userId,
      revokedAt: record.certificateRevocation?.revokedAt ?? null,
    };
  },
};
