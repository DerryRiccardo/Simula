import type { ComponentProps, ReactNode } from 'react';

import { Label, Textarea } from '@/components/ui';

export interface TextareaFieldProps extends ComponentProps<'textarea'> {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
}

// Pasangan TextField untuk isian panjang: label di atas, bantuan atau error di bawah.
export function TextareaField({ id, label, error, hint, ...textareaProps }: TextareaFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </Label>
      <Textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...textareaProps}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-ink-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
