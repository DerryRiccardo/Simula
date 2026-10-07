import { z } from 'zod';

import { REVISION_REASONS } from '@/constants/review';
import type {
  IGradeSubmissionPayload,
  IReviewDraftGrade,
  IRevisionRequestPayload,
  IRubricCriterion,
} from '@/types';

// Validasi form penilaian reviewer (CONTEXT.md 4.10). Server memvalidasi ulang aturan yang sama.

export const MIN_REASON_LENGTH = 20;

/** Satu poin per baris; baris kosong diabaikan. */
export const toPoints = (value: string) =>
  value
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

const pointsField = (label: string) =>
  z.string().refine((value) => toPoints(value).length > 0, `Tulis minimal satu poin ${label}.`);

export const gradeSchema = z.object({
  criteria: z.array(
    z.object({
      name: z.string(),
      // 0 = belum dipilih.
      level: z.number().int().min(1, 'Pilih level 1 sampai 5.').max(5),
      reason: z
        .string()
        .trim()
        .min(MIN_REASON_LENGTH, `Tulis alasan minimal ${MIN_REASON_LENGTH} karakter.`),
    })
  ),
  strengths: pointsField('kekuatan'),
  improvements: pointsField('yang perlu ditingkatkan'),
  nextSteps: pointsField('saran langkah berikutnya'),
  isRecommended: z.boolean(),
});

export type TGradeFormValues = z.infer<typeof gradeSchema>;

/** Isian awal: dari draft bila ada, dicocokkan per nama kriteria agar aman bila rubrik berubah. */
export const getGradeDefaults = (
  rubric: IRubricCriterion[],
  draft: IReviewDraftGrade | null
): TGradeFormValues => ({
  criteria: rubric.map((criterion) => {
    const saved = draft?.criteria.find((item) => item.name === criterion.name);
    return { name: criterion.name, level: saved?.level ?? 0, reason: saved?.reason ?? '' };
  }),
  strengths: draft?.strengths ?? '',
  improvements: draft?.improvements ?? '',
  nextSteps: draft?.nextSteps ?? '',
  isRecommended: draft?.isRecommended ?? false,
});

export const getRevisionDefaults = (
  draft: IRevisionRequestPayload | null
): TRevisionFormValues => ({ reason: draft?.reason ?? '', note: draft?.note ?? '' });

export const toGradePayload = (values: TGradeFormValues): IGradeSubmissionPayload => ({
  criteria: values.criteria.map(({ name, level, reason }) => ({ name, level, reason })),
  feedback: {
    strengths: toPoints(values.strengths),
    improvements: toPoints(values.improvements),
    nextSteps: toPoints(values.nextSteps),
  },
  isRecommended: values.isRecommended,
});

export const revisionSchema = z.object({
  reason: z
    .string()
    .refine(
      (value) => (REVISION_REASONS as readonly string[]).includes(value),
      'Pilih salah satu alasan.'
    ),
  note: z
    .string()
    .trim()
    .min(MIN_REASON_LENGTH, `Tulis catatan minimal ${MIN_REASON_LENGTH} karakter.`),
});

export type TRevisionFormValues = z.infer<typeof revisionSchema>;
