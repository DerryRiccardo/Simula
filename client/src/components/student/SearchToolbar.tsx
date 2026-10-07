'use client';

import { ArrowUpDown, Search, SlidersHorizontal, X } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { ChipFilter } from './FilterTabs';

/** Nilai 'all' berarti filter tidak aktif. */
export const FILTER_ALL = 'all';

interface IOption<T extends string = string> {
  value: T;
  label: string;
}

export interface IFilterSection {
  id: string;
  label: string;
  options: IOption[];
  value: string;
  onChange: (value: string) => void;
}

interface SearchToolbarProps<TSort extends string> {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  sortOptions: IOption<TSort>[];
  sort: TSort;
  onSortChange: (value: TSort) => void;
  filterSections: IFilterSection[];
  onResetFilters: () => void;
}

const controlClass =
  'flex h-10 shrink-0 items-center gap-2 rounded-control border border-line bg-white px-3 text-sm font-medium text-ink-muted transition-colors outline-none hover:border-ink/25 hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30 active:scale-[0.98] data-[state=open]:border-ink/25 data-[state=open]:text-ink';

// Kotak cari + urutkan + filter (popover), dipakai di Jelajahi Case dan Case Saya.
export function SearchToolbar<TSort extends string>({
  search,
  onSearchChange,
  searchPlaceholder,
  sortOptions,
  sort,
  onSortChange,
  filterSections,
  onResetFilters,
}: SearchToolbarProps<TSort>) {
  const activeSections = filterSections.filter((section) => section.value !== FILTER_ALL);
  const activeCount = activeSections.length;
  const sortLabel = sortOptions.find((option) => option.value === sort)?.label;

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-control border border-line bg-white pr-3 pl-9 text-sm text-ink transition-colors outline-none placeholder:text-ink-subtle hover:border-ink/25 focus:border-brand focus:ring-3 focus:ring-brand/15"
          />
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger className={controlClass} aria-label={`Urutkan: ${sortLabel}`}>
            <ArrowUpDown className="size-4" />
            <span className="hidden md:inline">{sortLabel}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Urutkan berdasarkan</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => onSortChange(value as TSort)}
            >
              {sortOptions.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger
            className={cn(controlClass, activeCount > 0 && 'border-ink/25 text-ink')}
            aria-label={`Filter${activeCount ? ` (${activeCount} aktif)` : ''}`}
          >
            <SlidersHorizontal className="size-4" />
            <span className="hidden md:inline">Filter</span>
            {activeCount > 0 && (
              <span className="grid size-5 place-items-center rounded-tag bg-ink font-mono text-[0.6875rem] text-white tabular-nums">
                {activeCount}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-ink">Filter</p>
              <button
                type="button"
                onClick={onResetFilters}
                disabled={activeCount === 0}
                className="text-xs font-medium text-brand hover:underline disabled:pointer-events-none disabled:text-ink-subtle"
              >
                Reset
              </button>
            </div>
            <div className="grid max-h-[60vh] gap-5 overflow-y-auto p-4">
              {filterSections.map((section) => (
                <div key={section.id}>
                  <p className="mb-2 text-xs font-medium text-ink-subtle">{section.label}</p>
                  <ChipFilter
                    ariaLabel={`Filter ${section.label.toLowerCase()}`}
                    options={section.options}
                    value={section.value}
                    onChange={section.onChange}
                    isWrapped
                  />
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {activeCount > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Filter aktif">
          {activeSections.map((section) => {
            const label =
              section.options.find((option) => option.value === section.value)?.label ??
              section.value;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => section.onChange(FILTER_ALL)}
                  className="flex items-center gap-1 rounded-tag border border-line bg-white py-0.5 pr-1.5 pl-2 text-xs font-medium text-ink transition-colors hover:border-ink/30"
                  aria-label={`Hapus filter ${label}`}
                >
                  <span className="text-ink-subtle">{section.label}:</span>
                  {label}
                  <X className="size-3.5 text-ink-subtle" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
