'use client';

import { Check } from 'lucide-react';

import { FIELD_OPTIONS, MAX_ONBOARDING_FIELDS } from '@/constants/fields';
import { cn } from '@/lib/utils';

interface FieldPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

export function FieldPicker({ value, onChange, error }: FieldPickerProps) {
  const isMaxReached = value.length >= MAX_ONBOARDING_FIELDS;

  const handleToggle = (key: string) => {
    if (value.includes(key)) onChange(value.filter((item) => item !== key));
    else if (!isMaxReached) onChange([...value, key]);
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-muted">Pilih 1 sampai {MAX_ONBOARDING_FIELDS} bidang</span>
        <span
          className={cn(
            'font-mono text-xs tabular-nums',
            value.length > 0 ? 'font-medium text-brand' : 'text-ink-subtle'
          )}
        >
          {value.length}/{MAX_ONBOARDING_FIELDS} dipilih
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3" role="group" aria-label="Bidang studi">
        {FIELD_OPTIONS.map((field) => {
          const Icon = field.icon;
          const isSelected = value.includes(field.key);
          const isDisabled = !isSelected && isMaxReached;
          return (
            <li key={field.key}>
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={isDisabled}
                onClick={() => handleToggle(field.key)}
                className={cn(
                  'group relative flex h-full w-full flex-col items-start rounded-card border p-4 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 outline-none focus-visible:ring-3 focus-visible:ring-brand/30',
                  isSelected
                    ? 'border-brand bg-brand-soft/60'
                    : 'border-line bg-white hover:-translate-y-0.5 hover:border-brand-muted hover:shadow-lift',
                  isDisabled &&
                    'cursor-not-allowed opacity-45 hover:translate-y-0 hover:border-line hover:shadow-none'
                )}
              >
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-control transition-colors duration-200',
                    isSelected ? 'bg-brand text-white' : 'bg-brand-soft text-brand'
                  )}
                >
                  <Icon className="size-[1.125rem]" strokeWidth={1.75} />
                </span>
                <span className="mt-3 text-sm font-medium text-ink">{field.label}</span>
                <span className="mt-0.5 text-xs leading-snug text-ink-subtle">
                  {field.description}
                </span>
                <span
                  className={cn(
                    'absolute top-3 right-3 grid size-5 place-items-center rounded-full border transition-all duration-200',
                    isSelected
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-white text-transparent'
                  )}
                  aria-hidden="true"
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
