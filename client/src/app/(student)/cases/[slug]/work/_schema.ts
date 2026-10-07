import { z } from 'zod';

import { isFileMeta, isSlotFilled } from '@/lib/submission';
import type { ISubmissionContent, ISubmissionSlot, TSlotValue } from '@/types';

// Validasi submission per slot (CONTEXT.md 4.7): tombol Submit aktif setelah semua slot wajib
// terisi dan valid, tautan dicentang "dapat diakses publik", dan centang "pekerjaan sendiri".

export interface ISubmissionFormValues {
  slots: Record<string, TSlotValue>;
  note: string;
  isLinkPublic: boolean;
  isOwnWork: boolean;
}

export const NOTE_MAX_LENGTH = 1000;
export const TEXT_MIN_LENGTH = 30;

export { isFileMeta, isSlotFilled };

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const fileMetaSchema = z.object({ fileName: z.string(), sizeBytes: z.number() });

function buildSlotSchema(slot: ISubmissionSlot) {
  if (slot.kind === 'file') {
    return fileMetaSchema
      .nullable()
      .refine((value) => !slot.isRequired || value !== null, 'Unggah berkas untuk slot ini.');
  }
  if (slot.kind === 'link') {
    return z
      .string()
      .trim()
      .refine((value) => !slot.isRequired || value !== '', 'Tempel tautan untuk slot ini.')
      .refine(
        (value) => value === '' || isHttpUrl(value),
        'Tautan harus diawali https:// dan bisa dibuka di browser.'
      );
  }
  return z
    .string()
    .trim()
    .refine((value) => !slot.isRequired || value !== '', 'Isi jawaban untuk slot ini.')
    .refine(
      (value) => value === '' || value.length >= TEXT_MIN_LENGTH,
      `Jawaban minimal ${TEXT_MIN_LENGTH} karakter.`
    );
}

export function buildSubmissionSchema(slots: ISubmissionSlot[]) {
  const linkSlotIds = slots.filter((slot) => slot.kind === 'link').map((slot) => slot.id);

  return z
    .object({
      slots: z.object(Object.fromEntries(slots.map((slot) => [slot.id, buildSlotSchema(slot)]))),
      note: z.string().max(NOTE_MAX_LENGTH, `Catatan maksimal ${NOTE_MAX_LENGTH} karakter.`),
      isLinkPublic: z.boolean(),
      isOwnWork: z.boolean().refine(Boolean, 'Centang pernyataan ini sebelum submit.'),
    })
    .superRefine((values, context) => {
      const hasLink = linkSlotIds.some((id) => isSlotFilled(values.slots[id] as TSlotValue));
      if (hasLink && !values.isLinkPublic) {
        context.addIssue({
          code: 'custom',
          path: ['isLinkPublic'],
          message: 'Pastikan semua tautan bisa dibuka tanpa login, lalu centang ini.',
        });
      }
    });
}

/** Nilai awal form: draft terakhir, lalu submission sebelumnya (saat revisi), lalu kosong. */
export function getInitialValues(
  slots: ISubmissionSlot[],
  source: ISubmissionContent | null
): ISubmissionFormValues {
  return {
    slots: Object.fromEntries(
      slots.map((slot) => [slot.id, source?.values[slot.id] ?? (slot.kind === 'file' ? null : '')])
    ),
    note: source?.note ?? '',
    isLinkPublic: source?.isLinkPublic ?? false,
    // Pernyataan keaslian wajib dicentang ulang setiap kali submit.
    isOwnWork: false,
  };
}

export const toSubmissionContent = (values: ISubmissionFormValues): ISubmissionContent => ({
  values: values.slots,
  note: values.note.trim(),
  isLinkPublic: values.isLinkPublic,
  isOwnWork: values.isOwnWork,
});

/** Validasi berkas saat dipilih. Mengembalikan pesan error, atau null bila valid. */
export function validateFile(slot: ISubmissionSlot, file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (slot.formats && !slot.formats.includes(extension)) {
    return `Format harus ${slot.formats.map((format) => format.toUpperCase()).join(', ')}.`;
  }
  if (slot.maxSizeMb && file.size > slot.maxSizeMb * 1024 * 1024) {
    return `Ukuran berkas maksimal ${slot.maxSizeMb} MB.`;
  }
  return null;
}
