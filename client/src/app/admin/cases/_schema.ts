import { z } from 'zod';

import type { IAdminCase, IAdminCaseInput, TTier } from '@/types';

// Validasi pembuat case (CONTEXT.md 4.11). Dipakai saat terbitkan; draft cukup berjudul dan
// setiap materi sudah punya berkas.
// Server memvalidasi ulang aturan yang sama.

const required = (label: string, min = 2) => z.string().trim().min(min, `${label} wajib diisi.`);
const hasLine = (value: string) => value.split(/\r?\n/).some((line) => line.trim());

export const adminCaseSchema = z
  .object({
    tier: z.enum(['ai', 'b2b']),
    title: required('Judul', 5),
    fieldKey: z.string().min(1, 'Pilih bidang.'),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    summary: z.string().trim().min(20, 'Tulis ringkasan minimal 20 karakter.'),
    about: z.string().trim().min(20, 'Tulis deskripsi minimal 20 karakter.'),
    activities: z.string().refine(hasLine, 'Tulis minimal satu aktivitas.'),
    skills: z.string().refine((value) => value.split(',').some((item) => item.trim()), {
      message: 'Tulis minimal satu skill.',
    }),
    prerequisites: z.string(),
    context: z.string().trim().min(40, 'Tulis konteks minimal 40 karakter.'),
    tasks: z
      .array(z.object({ title: required('Judul tugas'), description: required('Deskripsi tugas') }))
      .min(1, 'Tambahkan minimal satu tugas.'),
    materials: z.array(
      z.object({
        name: required('Nama materi'),
        format: z.string(),
        description: z.string(),
        fileId: z
          .string()
          .nullable()
          .refine((value) => Boolean(value), 'Unggah berkas materi.'),
        fileName: z.string().nullable(),
        sizeBytes: z.number().nullable(),
      })
    ),
    slots: z
      .array(
        z.object({
          title: required('Nama slot'),
          description: z.string(),
          kind: z.enum(['file', 'link', 'text']),
          isRequired: z.boolean(),
          formats: z.string(),
          maxSizeMb: z.number().int().min(1, 'Minimal 1 MB.').max(100, 'Maksimal 100 MB.'),
        })
      )
      .min(1, 'Tambahkan minimal satu slot deliverable.'),
    rubric: z
      .array(
        z.object({
          name: required('Nama kriteria'),
          weight: z.number().int().min(1, 'Minimal 1%.').max(100),
          description: required('Deskripsi kriteria'),
        })
      )
      .min(1, 'Tambahkan minimal satu kriteria.'),
    passingScore: z.number().int().min(1, 'Antara 1 dan 100.').max(100, 'Antara 1 dan 100.'),
    price: z.number().int().min(0),
    partnerId: z.string(),
    reviewerRole: z.string(),
  })
  .superRefine((value, ctx) => {
    const totalWeight = getTotalWeight(value.rubric);
    if (totalWeight !== 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['rubric'],
        message: `Total bobot ${totalWeight}%, harus tepat 100%.`,
      });
    }
    if (value.tier !== 'b2b') return;
    const b2bRules: [keyof IAdminCaseInput, boolean, string][] = [
      ['price', value.price >= 10_000, 'Harga minimal Rp10.000.'],
      ['partnerId', value.partnerId !== '', 'Pilih mitra.'],
      ['reviewerRole', value.reviewerRole.trim().length >= 2, 'Peran penilai wajib diisi.'],
    ];
    b2bRules.forEach(([path, isValid, message]) => {
      if (!isValid) ctx.addIssue({ code: 'custom', path: [path], message });
    });
  });

export const getTotalWeight = (rubric: { weight: number }[]) =>
  rubric.reduce(
    (total, criterion) => total + (Number.isFinite(criterion.weight) ? criterion.weight : 0),
    0
  );

/** Kerangka rubrik umum (CONTEXT.md 4.11) sebagai titik awal; bobot disesuaikan per case. */
const RUBRIC_TEMPLATE: IAdminCaseInput['rubric'] = [
  {
    name: 'Pemahaman masalah',
    weight: 20,
    description: 'Akar masalah dan konteks bisnis dipahami dengan benar.',
  },
  {
    name: 'Kualitas solusi',
    weight: 25,
    description: 'Solusi tepat, layak, dan menjawab masalah.',
  },
  {
    name: 'Penalaran dan keputusan',
    weight: 20,
    description: 'Pilihan dijelaskan alasannya, alternatif dan risiko dipertimbangkan.',
  },
  { name: 'Eksekusi', weight: 20, description: 'Ketelitian dan kualitas hasil kerja.' },
  {
    name: 'Komunikasi',
    weight: 15,
    description: 'Deliverable jelas, terstruktur, dan mudah dipahami.',
  },
];

/** Ambang lulus usulan default (CONTEXT.md bagian 7): AI 60, B2B 70. */
export const DEFAULT_PASSING_SCORE: Record<TTier, number> = { ai: 60, b2b: 70 };

export const getEmptyCase = (): IAdminCaseInput => ({
  tier: 'ai',
  title: '',
  fieldKey: '',
  level: 'beginner',
  summary: '',
  about: '',
  activities: '',
  skills: '',
  prerequisites: '',
  context: '',
  tasks: [{ title: '', description: '' }],
  materials: [],
  slots: [
    {
      title: '',
      description: '',
      kind: 'file',
      isRequired: true,
      formats: 'pdf, docx',
      maxSizeMb: 10,
    },
  ],
  rubric: RUBRIC_TEMPLATE,
  passingScore: DEFAULT_PASSING_SCORE.ai,
  price: 0,
  partnerId: '',
  reviewerRole: '',
});

/** Isian form dari case tersimpan, tanpa id, status, dan info kunci dari server. */
export const toCaseInput = ({
  id: _id,
  slug: _slug,
  status: _status,
  updatedAt: _updatedAt,
  isStructureLocked: _isStructureLocked,
  hasEnrollments: _hasEnrollments,
  ...input
}: IAdminCase): IAdminCaseInput => input;
