import { z } from 'zod';

import {
  NUMBER_SETTINGS,
  WHATSAPP_PATTERN,
  type INumberSettingMeta,
} from '@/constants/platformSettings';

// Validasi halaman Pengaturan; batas angkanya sama dengan validasi server (constants/platformSettings).

const bounded = (key: INumberSettingMeta['key']) => {
  const meta = NUMBER_SETTINGS.find((item) => item.key === key);
  if (!meta) throw new Error(`Aturan pengaturan ${key} tidak ditemukan.`);
  return z
    .number({ error: 'Isi dengan angka.' })
    .int('Isi bilangan bulat.')
    .min(meta.min, `Minimal ${meta.min}.`)
    .max(meta.max, `Maksimal ${meta.max}.`);
};

export const settingsSchema = z.object({
  reviewSlaDays: bounded('reviewSlaDays'),
  maxRevisions: bounded('maxRevisions'),
  revisionExtraDays: bounded('revisionExtraDays'),
  recommendationThreshold: bounded('recommendationThreshold'),
  passingScoreAi: bounded('passingScoreAi'),
  passingScoreB2b: bounded('passingScoreB2b'),
  b2bStartWindowDays: bounded('b2bStartWindowDays'),
  paymentWindowHours: bounded('paymentWindowHours'),
  whatsappNumber: z
    .string()
    .trim()
    .regex(WHATSAPP_PATTERN, 'Gunakan format 62xxxxxxxxxx tanpa spasi atau tanda +.'),
});
