'use client';

import { GraduationCap, Rocket } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { TStudentStatus } from '@/types';
import { STUDENT_STATUS_OPTIONS } from '@/constants/studentStatus';

const ICONS: Record<TStudentStatus, typeof GraduationCap> = {
  final_year: GraduationCap,
  fresh_graduate: Rocket,
};

interface StatusPickerProps {
  value: TStudentStatus | undefined;
  onChange: (value: TStudentStatus) => void;
  error?: string;
}

export function StatusPicker({ value, onChange, error }: StatusPickerProps) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 text-sm font-medium text-ink">Status kamu saat ini</legend>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
        {STUDENT_STATUS_OPTIONS.map((option) => {
          const Icon = ICONS[option.value];
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex items-start gap-3 rounded-card border p-4 text-left transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-brand/30',
                isSelected
                  ? 'border-brand bg-brand-soft/60'
                  : 'border-line bg-white hover:border-brand-muted'
              )}
            >
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-control transition-colors',
                  isSelected ? 'bg-brand text-white' : 'bg-brand-soft text-brand'
                )}
              >
                <Icon className="size-[1.125rem]" strokeWidth={1.75} />
              </span>
              <span>
                <span className="block text-sm font-medium text-ink">{option.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-subtle">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
