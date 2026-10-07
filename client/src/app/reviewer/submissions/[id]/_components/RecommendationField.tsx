'use client';

import { Controller, type Control } from 'react-hook-form';

import { Checkbox } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { TGradeFormValues } from '../_schema';

interface RecommendationFieldProps {
  control: Control<TGradeFormValues>;
  partnerName: string | undefined;
  /** Rekomendasi hanya untuk kandidat yang lulus. */
  isEnabled: boolean;
  threshold: number;
}

// Rekomendasi interview: keputusan reviewer, sistem hanya memberi saran ambang skor.
export function RecommendationField({
  control,
  partnerName,
  isEnabled,
  threshold,
}: RecommendationFieldProps) {
  return (
    <Controller
      control={control}
      name="isRecommended"
      render={({ field }) => (
        <label
          className={cn(
            'flex gap-3 rounded-card border border-line p-5 text-sm',
            isEnabled ? 'cursor-pointer bg-white' : 'cursor-not-allowed bg-surface-soft/60'
          )}
        >
          <Checkbox
            checked={field.value}
            disabled={!isEnabled}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            className="mt-0.5"
          />
          <span>
            <span className="block font-medium text-ink">
              Rekomendasikan ke daftar prioritas interview {partnerName}
            </span>
            <span className="mt-0.5 block leading-relaxed text-ink-muted">
              {isEnabled
                ? `Disarankan untuk skor ${threshold} ke atas. Profil baru dibagikan setelah kandidat menyetujuinya.`
                : 'Hanya tersedia untuk kandidat yang lulus.'}
            </span>
          </span>
        </label>
      )}
    />
  );
}
