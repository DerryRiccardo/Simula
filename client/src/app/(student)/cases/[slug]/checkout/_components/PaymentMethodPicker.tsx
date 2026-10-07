'use client';

import { PAYMENT_METHOD_GROUPS } from '@/constants/payment';
import { formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { TPaymentMethod } from '@/types';

interface PaymentMethodPickerProps {
  value: TPaymentMethod;
  onChange: (value: TPaymentMethod) => void;
}

// Radio button asli (bisa dipilih dengan keyboard), dibungkus baris bersekat garis.
export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  return (
    <fieldset className="grid gap-6">
      <legend className="sr-only">Metode pembayaran</legend>
      {PAYMENT_METHOD_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-2.5 text-xs text-ink-subtle">{group.label}</p>
          <div className="divide-y divide-line overflow-hidden rounded-card border border-line">
            {group.options.map((option) => {
              const isSelected = option.value === value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3.5 px-4 py-3.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-brand/30 has-focus-visible:ring-inset',
                    isSelected ? 'bg-brand-soft/60' : 'hover:bg-surface-soft/70'
                  )}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => onChange(option.value)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      'grid size-4 shrink-0 place-items-center rounded-full border transition-colors',
                      isSelected ? 'border-brand' : 'border-ink/25'
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && <span className="size-2 rounded-full bg-brand" />}
                  </span>
                  <option.icon
                    className="size-[1.125rem] shrink-0 text-ink-muted"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{option.label}</span>
                    <span className="block text-xs text-ink-subtle">{option.hint}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink-subtle tabular-nums">
                    {option.adminFee === 0 ? 'Tanpa biaya' : `+${formatPrice(option.adminFee)}`}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
