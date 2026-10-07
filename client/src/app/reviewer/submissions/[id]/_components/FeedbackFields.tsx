'use client';

import { Controller, type Control } from 'react-hook-form';

import { TextareaField } from '@/components/forms';
import { toPoints, type TGradeFormValues } from '../_schema';

const FEEDBACK_FIELDS: {
  name: 'strengths' | 'improvements' | 'nextSteps';
  label: string;
  placeholder: string;
}[] = [
  {
    name: 'strengths',
    label: 'Kekuatan',
    placeholder: 'Model mudah diaudit karena input, perhitungan, dan output dipisah per tab.',
  },
  {
    name: 'improvements',
    label: 'Yang perlu ditingkatkan',
    placeholder: 'Cantumkan sumber untuk setiap asumsi biaya.',
  },
  {
    name: 'nextSteps',
    label: 'Saran langkah berikutnya',
    placeholder: 'Pelajari analisis sensitivitas untuk melihat asumsi yang paling berpengaruh.',
  },
];

// Feedback keseluruhan tiga bagian (CONTEXT.md 4.10); setiap baris menjadi satu poin.
export function FeedbackFields({ control }: { control: Control<TGradeFormValues> }) {
  return (
    <section aria-labelledby="feedback-form-title" className="grid gap-4">
      <div>
        <h2 id="feedback-form-title" className="text-[0.9375rem] md:text-[0.9375rem]">
          Feedback keseluruhan
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Tulis satu poin per baris.</p>
      </div>
      {FEEDBACK_FIELDS.map((feedback) => (
        <Controller
          key={feedback.name}
          control={control}
          name={feedback.name}
          render={({ field, fieldState }) => (
            <TextareaField
              id={`feedback-${feedback.name}`}
              label={feedback.label}
              hint={`${toPoints(field.value).length} poin`}
              error={fieldState.error?.message}
              placeholder={feedback.placeholder}
              {...field}
            />
          )}
        />
      ))}
    </section>
  );
}
