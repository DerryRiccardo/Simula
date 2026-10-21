import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface IBreadcrumbItem {
  label: string;
  /** Tanpa href: judul grup menu (bukan halaman) atau halaman yang sedang dibuka. */
  href?: string;
}

interface BreadcrumbProps {
  items: IBreadcrumbItem[];
  className?: string;
}

// Jejak halaman di header dashboard. Setiap tingkat yang punya halaman bisa diklik untuk kembali.
// Di ponsel hanya tampil satu tautan "kembali" ke tingkat terdekat, karena ruangnya sempit.
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const parent = [...items.slice(0, -1)].reverse().find((item) => item.href);
  const current = items[items.length - 1];

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0 flex-1', className)}>
      {parent?.href ? (
        <Link
          href={parent.href}
          className="group flex w-fit max-w-full items-center gap-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:hidden"
        >
          <ChevronLeft className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
          <span className="truncate">{parent.label}</span>
        </Link>
      ) : (
        current && (
          <p className="truncate text-sm font-semibold text-ink sm:hidden">{current.label}</p>
        )
      )}

      <ol className="hidden items-center gap-1.5 text-sm sm:flex">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="truncate font-semibold text-ink">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="truncate rounded-tag text-ink-subtle underline-offset-4 transition-colors outline-none hover:text-ink hover:underline focus-visible:ring-3 focus-visible:ring-brand/30"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="truncate text-ink-subtle">{item.label}</span>
              )}
              {!isLast && <ChevronRight className="size-3.5 shrink-0 text-ink-subtle" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
