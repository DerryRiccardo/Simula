'use client';

import { Controller, type Control } from 'react-hook-form';

import { TextareaField } from '@/components/forms';
import { RUBRIC_LEVELS } from '@/constants/review';
import { formatPoints, getCriterionPoints } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { IRubricCriterion } from '@/types';
import { MIN_REASON_LENGTH, type TGradeFormValues } from '../_schema';

interface LevelPickerProps {
  name: string;
  label: string;
  value: number;
  onChange: (level: number) => void;
  onBlur: () => void;
  isInvalid: boolean;
}

// Radio native yang disembunyikan: navigasi panah dan pembaca layar bekerja tanpa kode tambahan.
function LevelPicker({ name, label, value, onChange, onBlur, isInvalid }: LevelPickerProps) {
  return (
    <fieldset
      aria-invalid={isInvalid || undefined}
      className={cn(
        'grid grid-cols-5 gap-1 rounded-control border bg-surface-soft p-1',
        isInvalid ? 'border-destructive' : 'border-line'
      )}
    >
      <legend className="sr-only">{label}</legend>
      {RUBRIC_LEVELS.map((item) => (
        <label key={item.level} className="relative">
          <input
            type="radio"
            name={name}
            value={item.level}
            checked={value === item.level}
            onChange={() => onChange(item.level)}
            onBlur={onBlur}
            className="peer sr-only"
          />
          <span className="flex cursor-pointer flex-col items-center rounded-[6px] px-1 py-2 text-ink-muted transition-[background-color,color] duration-150 peer-checked:bg-brand peer-checked:text-white peer-checked:shadow-sm peer-focus-visible:ring-3 peer-focus-visible:ring-brand/30 hover:bg-white hover:text-ink peer-checked:hover:bg-brand peer-checked:hover:text-white active:scale-[0.98]">
            <span className="font-mono text-sm font-semibold tabular-nums">{item.level}</span>
            <span className="hidden text-[0.6875rem] opacity-80 sm:block">{item.label}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

interface CriterionFieldProps {
  index: number;
  criterion: IRubricCriterion;
  control: Control<TGradeFormValues>;
}

// Satu kriteria rubrik: level 1-5 dengan deskripsinya, lalu alasan yang dikirim ke kandidat.
export function CriterionField({ index, criterion, control }: CriterionFieldProps) {
  const titleId = `criterion-${index}-title`;

  return (
    <section aria-labelledby={titleId} className="rounded-card border border-line bg-white p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 id={titleId} className="text-[0.9375rem] md:text-[0.9375rem]">
          {criterion.name}
        </h3>
        <span className="shrink-0 font-mono text-xs text-ink-subtle tabular-nums">
          Bobot {criterion.weight}%
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{criterion.description}</p>

      <Controller
        control={control}
        name={`criteria.${index}.level`}
        render={({ field, fieldState }) => {
          const selected = RUBRIC_LEVELS.find((item) => item.level === field.value);
          return (
            <div className="mt-4">
              <LevelPicker
                name={`criterion-${index}-level`}
                label={`Level ${criterion.name}`}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                isInvalid={Boolean(fieldState.error)}
              />
              <div className="mt-2 flex min-h-5 items-baseline justify-between gap-4 text-xs">
                {fieldState.error ? (
                  <p className="text-destructive" role="alert">
                    {fieldState.error.message}
                  </p>
                ) : (
                  <p className="text-ink-muted">
                    {selected
                      ? `${selected.label}: ${selected.description}`
                      : 'Pilih level yang paling sesuai dengan hasil kerja kandidat.'}
                  </p>
                )}
                {selected && (
                  <span className="shrink-0 font-mono text-ink tabular-nums">
                    {formatPoints(getCriterionPoints({ level: selected.level, ...criterion }))}
                    <span className="text-ink-subtle">/{criterion.weight}</span>
                  </span>
                )}
              </div>
            </div>
          );
        }}
      />

      <Controller
        control={control}
        name={`criteria.${index}.reason`}
        render={({ field, fieldState }) => (
          <div className="mt-4">
            <TextareaField
              id={`criterion-${index}-reason`}
              label="Alasan"
              hint={`Wajib, minimal ${MIN_REASON_LENGTH} karakter. Dikirim ke kandidat apa adanya.`}
              error={fieldState.error?.message}
              placeholder="Contoh: rumus konsisten di semua cabang, tetapi asumsi biaya sewa belum disertai sumber."
              {...field}
            />
          </div>
        )}
      />
    </section>
  );
}
