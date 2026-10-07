import { z } from 'zod';

import { MAX_ONBOARDING_FIELDS } from '@/constants/fields';

export const onboardingSchema = z.object({
  fieldKeys: z
    .array(z.string())
    .min(1, 'Pilih minimal 1 bidang')
    .max(MAX_ONBOARDING_FIELDS, `Pilih maksimal ${MAX_ONBOARDING_FIELDS} bidang`),
  studentStatus: z.enum(['final_year', 'fresh_graduate'], {
    error: 'Pilih status kamu saat ini',
  }),
  major: z.string().trim().max(100, 'Maksimal 100 karakter').optional(),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
