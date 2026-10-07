'use client';

import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useCaseDetail } from '@/hooks/useLearning';
import { CaseHeader } from './CaseHeader';
import { CaseOverview } from './CaseOverview';
import { CasePriceCard } from './CasePriceCard';

// Kolom dokumen fleksibel + rel kanan tetap untuk kartu harga.
const BODY_GRID = 'grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14';

function CaseDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10" role="status" aria-label="Memuat">
      <div className="grid gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-4 h-16 w-full" />
      </div>
      <div className={BODY_GRID}>
        <div className="grid content-start gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-6 h-5 w-48" />
          <Skeleton className="h-24 w-full rounded-control" />
        </div>
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

export function CaseDetailView({ slug }: { slug: string }) {
  const { data: detail, isLoading, isError, refetch } = useCaseDetail(slug);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 pb-10">
      <Link
        href={PATHS.cases}
        className="group flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Jelajahi Case
      </Link>

      {isLoading ? (
        <CaseDetailSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !detail ? (
        <EmptyState
          icon={SearchX}
          title="Case tidak ditemukan"
          description="Case ini mungkin sudah tidak tersedia, atau tautannya salah."
          action={
            <Button asChild size="pill">
              <Link href={PATHS.cases}>Lihat case lain</Link>
            </Button>
          }
        />
      ) : (
        <>
          <CaseHeader detail={detail} />
          <div className={BODY_GRID}>
            {/* Di ponsel kartu harga tampil lebih dulu agar tombol aksi langsung terlihat. */}
            <aside className="lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1 lg:self-start">
              <CasePriceCard detail={detail} />
            </aside>
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <CaseOverview detail={detail} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
