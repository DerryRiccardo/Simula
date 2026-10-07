'use client';

import { cn } from '@/lib/utils';

interface IOption<T extends string> {
  value: T;
  label: string;
  /** Angka kecil di samping label, misalnya jumlah data. */
  count?: number;
}

interface FilterTabsProps<T extends string> {
  options: IOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

// Segmented control: satu wadah abu-abu, opsi aktif menjadi "kertas" putih bergaris tipis.
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: FilterTabsProps<T>) {
  return (
    <div
      className={cn(
        'scrollbar-none inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-control bg-surface-soft p-1',
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-tag px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-3 focus-visible:ring-brand/30 active:scale-[0.98]',
              isActive
                ? 'bg-white text-ink shadow-[0_1px_2px_rgb(16_40_122/0.06)] ring-1 ring-line'
                : 'text-ink-subtle hover:text-ink'
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'font-mono text-xs tabular-nums',
                  isActive ? 'text-ink-subtle' : 'text-ink-subtle/70'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface ChipFilterProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** true = chip turun ke baris berikutnya (mis. di dalam popover), bukan digulir horizontal. */
  isWrapped?: boolean;
}

export function ChipFilter<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  isWrapped = false,
}: ChipFilterProps<T>) {
  return (
    <div
      className={cn(
        'flex gap-1.5',
        isWrapped
          ? 'flex-wrap'
          : '-mx-4 scrollbar-none overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0'
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'shrink-0 rounded-tag border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-brand/30',
              isActive
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-white text-ink-muted hover:border-ink/30 hover:text-ink'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
