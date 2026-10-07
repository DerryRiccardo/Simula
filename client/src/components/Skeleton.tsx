import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-tag bg-line/60', className)} aria-hidden="true" />
  );
}

/** Kerangka grid kartu, menyerupai CaseCard (kartu datar tanpa header gambar). */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}
      role="status"
      aria-label="Memuat"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="grid gap-3 rounded-card border border-line bg-white p-5">
          <div className="flex justify-between">
            <Skeleton className="size-9 rounded-control" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="mt-2 h-3 w-1/3" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="mt-3 flex justify-between border-t border-line pt-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Kerangka panel daftar, menyerupai EnrollmentList. */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white"
      role="status"
      aria-label="Memuat"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3.5 px-5 py-4">
          <Skeleton className="size-9 shrink-0 rounded-control" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/3 max-w-md" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-5 w-24 md:block" />
          <Skeleton className="hidden h-4 w-20 md:block" />
        </div>
      ))}
    </div>
  );
}
