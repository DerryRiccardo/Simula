'use client';

import { useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CornerDownLeft, FileText, Search, type LucideIcon } from 'lucide-react';
import { Dialog } from 'radix-ui';

import { PATHS } from '@/constants/paths';
import { STUDENT_NAV_FLAT } from '@/constants/studentNav';
import { useDebounce } from '@/hooks/useDebounce';
import { useCaseCatalog } from '@/hooks/useLearning';
import { cn } from '@/lib/utils';

interface IResult {
  id: string;
  group: 'Halaman' | 'Case';
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
}

interface CommandSearchProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function CommandResults({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const keyword = query.trim();
  const debouncedKeyword = useDebounce(keyword, 250);
  const { data: caseData } = useCaseCatalog({ search: debouncedKeyword || undefined, limit: 5 });

  const pageResults: IResult[] = STUDENT_NAV_FLAT.filter((item) =>
    item.label.toLowerCase().includes(keyword.toLowerCase())
  ).map((item) => ({
    id: `page-${item.id}`,
    group: 'Halaman',
    label: item.label,
    href: item.href,
    icon: item.icon ?? ArrowRight,
  }));
  const caseResults: IResult[] = keyword
    ? (caseData?.data ?? []).map((item) => ({
        id: `case-${item.id}`,
        group: 'Case',
        label: item.title,
        hint: item.tier === 'ai' ? 'AI Case Study' : 'B2B Case Study',
        href: PATHS.caseDetail(item.slug),
        icon: FileText,
      }))
    : [];
  const searchAll: IResult[] = keyword
    ? [
        {
          id: 'search-all',
          group: 'Case',
          label: `Lihat semua case untuk "${keyword}"`,
          href: `${PATHS.cases}?search=${encodeURIComponent(keyword)}`,
          icon: Search,
        },
      ]
    : [];
  const results = [...pageResults, ...caseResults, ...searchAll];
  const safeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));

  const openResult = (result: IResult | undefined) => {
    if (!result) return;
    onClose();
    router.push(result.href);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((safeIndex + step + results.length) % Math.max(results.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      openResult(results[safeIndex]);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-[1.125rem] shrink-0 text-ink-subtle" strokeWidth={1.75} />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Cari halaman atau case…"
          aria-label="Cari halaman atau case"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={results[safeIndex]?.id}
          className="h-14 flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-subtle"
        />
        <Dialog.Close className="rounded border border-line bg-surface-soft px-1.5 py-0.5 text-[0.625rem] font-semibold text-ink-subtle transition-colors hover:text-ink">
          ESC
        </Dialog.Close>
      </div>

      <ul id="command-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
        {results.length === 0 ? (
          <li className="px-3 py-10 text-center text-sm text-ink-muted">
            Tidak ada hasil untuk &ldquo;{keyword}&rdquo;.
          </li>
        ) : (
          results.map((result, index) => {
            const isActive = index === safeIndex;
            const isGroupStart = index === 0 || results[index - 1].group !== result.group;
            const Icon = result.icon;
            return (
              <li key={result.id} role="presentation">
                {isGroupStart && (
                  <p className="px-3 pt-2 pb-1.5 text-[0.6875rem] font-semibold tracking-[0.14em] text-ink-subtle uppercase">
                    {result.group}
                  </p>
                )}
                <button
                  type="button"
                  id={result.id}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={-1}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => openResult(result)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    isActive ? 'bg-brand-soft text-brand' : 'text-ink'
                  )}
                >
                  <Icon
                    className={cn('size-4 shrink-0', isActive ? 'text-brand' : 'text-ink-subtle')}
                  />
                  <span className="min-w-0 flex-1 truncate">{result.label}</span>
                  {result.hint && (
                    <span className="shrink-0 text-xs text-ink-subtle">{result.hint}</span>
                  )}
                  {isActive && <CornerDownLeft className="size-3.5 shrink-0" />}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </>
  );
}

// Palet pencarian cepat (Ctrl/⌘ K): pindah halaman atau langsung membuka detail case.
export function CommandSearch({ isOpen, onOpenChange }: CommandSearchProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-white shadow-lift data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0">
          <Dialog.Title className="sr-only">Pencarian cepat</Dialog.Title>
          <Dialog.Description className="sr-only">
            Ketik untuk mencari halaman atau case, lalu tekan Enter untuk membuka.
          </Dialog.Description>
          {/* Dirender ulang setiap dibuka agar kata kunci lama tidak tertinggal. */}
          {isOpen && <CommandResults onClose={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
