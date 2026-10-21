'use client';

import Link from 'next/link';
import { ArrowLeft, History, SearchX } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { EmptyState, ErrorState, Skeleton } from '@/components';
import { CasePanel, DecisionSummary } from '@/components/review';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useReviewSubmission } from '@/hooks/useReviewer';
import type { IReviewSubmissionDetail } from '@/types';
import { DecisionPanel } from './DecisionPanel';
import { ReviewHeader } from './ReviewHeader';

// Kiri: submission dan brief (menempel saat menggulir). Kanan: form penilaian.
const REVIEW_GRID = 'grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10';

function ReviewContent({ detail }: { detail: IReviewSubmissionDetail }) {
  const { item, lastRevision } = detail;
  const isPending = item.status === 'in_review';
  const revisionNotice = isPending && item.attempt > 1 && lastRevision && (
    <div className="flex gap-3 border-b border-line bg-surface-soft/60 p-5">
      <History className="mt-0.5 size-4 shrink-0 text-ink-subtle" strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">Submit ulang setelah revisi</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
          Permintaanmu sebelumnya: <span className="text-ink">{lastRevision.reason}</span>.{' '}
          {lastRevision.note}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <ReviewHeader detail={detail} />
      <div className={REVIEW_GRID}>
        <aside className="grid content-start gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
          <CasePanel detail={detail} notice={revisionNotice} />
        </aside>
        <Reveal offset={12} className="min-w-0">
          {isPending ? (
            <DecisionPanel detail={detail} />
          ) : (
            <DecisionSummary
              item={detail.item}
              review={detail.review}
              lastRevision={detail.lastRevision}
              revisionFootnote="Menunggu kandidat mengirim ulang. Submission ulang kembali ke antreanmu."
            />
          )}
        </Reveal>
      </div>
    </>
  );
}

function ReviewSkeleton() {
  return (
    <div className="grid gap-8" role="status" aria-label="Memuat">
      <div className="grid gap-3 border-b border-line pb-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className={REVIEW_GRID}>
        <Skeleton className="h-96 rounded-card" />
        <div className="grid content-start gap-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-56 rounded-card" />
          <Skeleton className="h-56 rounded-card" />
        </div>
      </div>
    </div>
  );
}

// Halaman review per kandidat (CONTEXT.md 4.10). Kandidat anonim; keputusan final.
export function ReviewView({ id }: { id: string }) {
  const { data: detail, isLoading, isError, refetch } = useReviewSubmission(id);

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8">
      <Link
        href={PATHS.reviewer}
        className="group flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Antrean review
      </Link>

      {isLoading ? (
        <ReviewSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !detail ? (
        <EmptyState
          icon={SearchX}
          title="Submission tidak ditemukan"
          description="Submission ini tidak ada di antreanmu, atau sudah dipindahkan ke reviewer lain."
          action={
            <Button asChild size="pill">
              <Link href={PATHS.reviewer}>Kembali ke antrean</Link>
            </Button>
          }
        />
      ) : (
        <ReviewContent detail={detail} />
      )}
    </div>
  );
}
