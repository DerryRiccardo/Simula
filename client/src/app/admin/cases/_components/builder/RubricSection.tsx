'use client';

import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { TextField } from '@/components/forms';
import { cn } from '@/lib/utils';
import type { IAdminCaseInput } from '@/types';
import { getTotalWeight } from '@/app/admin/cases/_schema';
import { AddItemButton, BuilderSection, ItemCard, toNumberInput } from './BuilderParts';

// Rubrik (bagian 5): dipakai reviewer dan AI. Skor = Σ (level ÷ 5 × bobot), total bobot 100%.
export function RubricSection() {
  const { control, register, formState } = useFormContext<IAdminCaseInput>();
  const { errors } = formState;
  const rubric = useFieldArray({ control, name: 'rubric' });
  const totalWeight = getTotalWeight(useWatch({ control, name: 'rubric' }));
  const isBalanced = totalWeight === 100;

  return (
    <BuilderSection
      id="rubric"
      title="Rubrik penilaian"
      description="Reviewer dan AI menilai setiap kriteria di level 1 sampai 5. Diisi dari kerangka rubrik umum; sesuaikan nama, bobot, dan deskripsinya."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line px-4 py-3">
        <p className="text-sm text-ink-muted" aria-live="polite">
          Total bobot{' '}
          <span
            className={cn(
              'font-mono font-semibold tabular-nums',
              isBalanced ? 'text-ai' : 'text-destructive'
            )}
          >
            {totalWeight}%
          </span>
          {!isBalanced && <span className="text-ink-subtle">, harus tepat 100%</span>}
        </p>
        <Controller
          control={control}
          name="passingScore"
          render={({ field, fieldState }) => (
            <div className="flex items-center gap-2">
              <label htmlFor="passing-score" className="text-sm text-ink-muted">
                Ambang lulus
              </label>
              <input
                id="passing-score"
                min={1}
                max={100}
                aria-invalid={fieldState.error ? true : undefined}
                className="h-9 w-20 rounded-control border border-line bg-white px-3 font-mono text-sm text-ink tabular-nums outline-none focus:border-brand focus:ring-3 focus:ring-brand/15 aria-invalid:border-destructive"
                {...toNumberInput(field)}
              />
            </div>
          )}
        />
      </div>
      {(errors.rubric?.root?.message ?? errors.rubric?.message) && (
        <p className="-mt-3 text-xs text-destructive" role="alert">
          {errors.rubric?.root?.message ?? errors.rubric?.message}
        </p>
      )}

      {rubric.fields.map((criterion, index) => (
        <ItemCard
          key={criterion.id}
          label={`Kriteria ${index + 1}`}
          onRemove={rubric.fields.length > 1 ? () => rubric.remove(index) : undefined}
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <TextField
              id={`criterion-${index}-name`}
              label="Nama kriteria"
              error={errors.rubric?.[index]?.name?.message}
              {...register(`rubric.${index}.name`)}
            />
            <Controller
              control={control}
              name={`rubric.${index}.weight`}
              render={({ field, fieldState }) => (
                <TextField
                  id={`criterion-${index}-weight`}
                  label="Bobot (%)"
                  min={1}
                  max={100}
                  error={fieldState.error?.message}
                  {...toNumberInput(field)}
                />
              )}
            />
          </div>
          <TextField
            id={`criterion-${index}-description`}
            label="Yang dinilai"
            error={errors.rubric?.[index]?.description?.message}
            {...register(`rubric.${index}.description`)}
          />
        </ItemCard>
      ))}
      <AddItemButton
        label="Tambah kriteria"
        onClick={() => rubric.append({ name: '', weight: 0, description: '' })}
      />
    </BuilderSection>
  );
}
