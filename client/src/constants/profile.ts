import type { TShareDefault } from '@/types';

export const SHARE_DEFAULT_OPTIONS: { value: TShareDefault; label: string; description: string }[] =
  [
    {
      value: 'ask',
      label: 'Tanya setiap kali',
      description: 'Kamu memutuskan per mitra saat direkomendasikan. Disarankan.',
    },
    {
      value: 'always',
      label: 'Selalu izinkan',
      description: 'Profil langsung dibagikan ke mitra yang merekomendasikanmu.',
    },
    {
      value: 'never',
      label: 'Jangan bagikan',
      description: 'Rekomendasi tetap tercatat, tetapi profilmu tidak dibagikan.',
    },
  ];
