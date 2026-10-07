import { z } from 'zod';

import { MAX_ONBOARDING_FIELDS } from '@/constants/fields';
import type { IProfile, IProfileDetailsPayload } from '@/types';

const LINKEDIN_URL = /^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;

export const profileDetailsSchema = z.object({
  name: z.string().trim().min(3, 'Nama minimal 3 karakter').max(80, 'Maksimal 80 karakter'),
  institution: z.string().trim().max(100, 'Maksimal 100 karakter'),
  major: z.string().trim().max(100, 'Maksimal 100 karakter'),
  studentStatus: z.enum(['final_year', 'fresh_graduate'], {
    error: 'Pilih status kamu saat ini',
  }),
  linkedinUrl: z
    .string()
    .trim()
    .refine((value) => value === '' || LINKEDIN_URL.test(value), {
      message: 'Gunakan format https://linkedin.com/in/nama-kamu',
    }),
  fieldKeys: z
    .array(z.string())
    .min(1, 'Pilih minimal 1 bidang')
    .max(MAX_ONBOARDING_FIELDS, `Pilih maksimal ${MAX_ONBOARDING_FIELDS} bidang`),
});

export type ProfileDetailsFormValues = z.infer<typeof profileDetailsSchema>;

export const getDetailsDefaults = ({
  user,
  institution,
  linkedinUrl,
}: IProfile): ProfileDetailsFormValues => ({
  name: user.name,
  institution: institution ?? '',
  major: user.major ?? '',
  studentStatus: user.studentStatus ?? 'final_year',
  linkedinUrl: linkedinUrl ?? '',
  fieldKeys: user.fieldKeys,
});

export const toDetailsPayload = (values: ProfileDetailsFormValues): IProfileDetailsPayload => ({
  name: values.name,
  institution: values.institution || null,
  major: values.major || null,
  studentStatus: values.studentStatus,
  linkedinUrl: values.linkedinUrl || null,
  fieldKeys: values.fieldKeys,
});
