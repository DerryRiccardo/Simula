import { getCaseBrief } from '@/mocks/data/caseBriefs';
import { findCaseById } from '@/mocks/data/cases';
import { mockDb, type IMockEnrollmentRecord } from '@/mocks/db';
import { learningApi } from '@/mocks/learningApi';
import type {
  ICaseWorkspace,
  IEnrollment,
  IFileMeta,
  ISubmissionContent,
  ISubmissionDraft,
  TEnrollmentStatus,
} from '@/types';

// Logika halaman pengerjaan untuk mode mock. Dipakai service saat mock aktif dan oleh handler MSW.

const EDITABLE_STATUSES: TEnrollmentStatus[] = ['in_progress', 'revision_requested'];

export function getOwnedRecord(enrollmentId: string) {
  const user = mockDb.getSessionUser();
  if (!user) throw new Error('Silakan masuk terlebih dahulu.');
  const record = mockDb.listEnrollments(user.id).find((item) => item.id === enrollmentId);
  if (!record) throw new Error('Case tidak ditemukan di akunmu.');
  return record;
}

export function toEnrollment(record: IMockEnrollmentRecord): IEnrollment {
  const caseSummary = findCaseById(record.caseId);
  if (!caseSummary) throw new Error('Case tidak ditemukan.');
  const { id, status, deadlineAt, updatedAt, score, certificateId } = record;
  return { id, caseSummary, status, deadlineAt, updatedAt, score, certificateId };
}

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export const workspaceApi = {
  /** null jika slug tidak ditemukan. Brief tetap dikirim; halaman yang menahan aksesnya. */
  getWorkspace: (slug: string): ICaseWorkspace | null => {
    const caseInfo = learningApi.getCaseBySlug(slug);
    if (!caseInfo) return null;
    const user = mockDb.getSessionUser();
    const record = user
      ? mockDb.listEnrollments(user.id).find((item) => item.caseId === caseInfo.id)
      : undefined;
    return {
      caseInfo,
      brief: getCaseBrief(caseInfo),
      enrollment: record ? toEnrollment(record) : null,
      draft: record?.draft ?? null,
      submission: record?.submission ?? null,
      revision: record?.revision ?? null,
    };
  },

  /** B2B: "Belum dimulai" → "Sedang dikerjakan", tenggat dihitung sejak saat ini (CONTEXT 4.7). */
  startWork: (enrollmentId: string): IEnrollment => {
    const record = getOwnedRecord(enrollmentId);
    if (record.status !== 'not_started') throw new Error('Case ini sudah dimulai.');
    const caseInfo = findCaseById(record.caseId);
    const detail = caseInfo && learningApi.getCaseBySlug(caseInfo.slug);
    const deadlineDays = detail ? getCaseBrief(detail).deadlineDays : null;
    const updated = mockDb.updateEnrollment(enrollmentId, {
      status: 'in_progress',
      deadlineAt: deadlineDays ? daysFromNow(deadlineDays) : null,
    });
    mockDb.addEnrollmentEvent(enrollmentId, { type: 'started' });
    return toEnrollment(updated ?? record);
  },

  saveDraft: (enrollmentId: string, content: ISubmissionContent): ISubmissionDraft => {
    const record = getOwnedRecord(enrollmentId);
    if (!EDITABLE_STATUSES.includes(record.status)) {
      throw new Error('Submission ini sudah terkirim dan tidak bisa diubah.');
    }
    const draft: ISubmissionDraft = { ...content, savedAt: new Date().toISOString() };
    mockDb.updateEnrollment(enrollmentId, { draft });
    return draft;
  },

  /** Mode mock tidak mengunggah berkas; hanya nama dan ukurannya yang disimpan. */
  uploadFile: (file: File): IFileMeta => ({
    fileId: crypto.randomUUID(),
    fileName: file.name,
    sizeBytes: file.size,
  }),

  /** B2B → menunggu review; AI → sedang dinilai AI. Draft dibersihkan. */
  submitWork: (enrollmentId: string, content: ISubmissionContent): IEnrollment => {
    const record = getOwnedRecord(enrollmentId);
    if (!EDITABLE_STATUSES.includes(record.status)) {
      throw new Error('Submission ini sudah terkirim.');
    }
    const caseInfo = findCaseById(record.caseId);
    const attempt = (record.submission?.attempt ?? 0) + 1;
    const updated = mockDb.updateEnrollment(enrollmentId, {
      status: caseInfo?.tier === 'ai' ? 'ai_grading' : 'in_review',
      draft: null,
      // Catatan revisi terakhir disimpan agar reviewer bisa membandingkan submit ulang.
      submission: { ...content, submittedAt: new Date().toISOString(), attempt },
    });
    mockDb.addEnrollmentEvent(enrollmentId, { type: 'submitted', attempt });
    return toEnrollment(updated ?? record);
  },
};
