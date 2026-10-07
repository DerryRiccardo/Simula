import type { ComponentProps, ReactNode } from 'react';

import { Input, Label } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface TextFieldProps extends ComponentProps<'input'> {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Elemen di sisi kanan input, mis. tombol tampilkan kata sandi. */
  endAdornment?: ReactNode;
}

export const fieldInputClassName =
  'h-11 rounded-control bg-white px-3.5 text-[0.9375rem] md:text-[0.9375rem]';

export function TextField({
  id,
  label,
  error,
  hint,
  endAdornment,
  className,
  ...inputProps
}: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldInputClassName, endAdornment && 'pr-11', className)}
          {...inputProps}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-1 flex items-center">{endAdornment}</div>
        )}
      </div>
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
