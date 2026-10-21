'use client';

import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { EmptyState, ErrorState, Skeleton } from '@/components';
import { CasePanel, DecisionSummary } from '@/components/review';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useAdminReview } from '@/hooks/useAdminReviews';
import type { IAdminReviewDetail } from '@/types';
import { AdminNotes } from './AdminNotes';
import { DetailHeader } from './DetailHeader';
import { EventTimeline } from './EventTimeline';
import { PendingPanel } from './PendingPanel';
import { ReviewActions } from './ReviewActions';

// Kiri: submission dan brief (menempel saat menggulir). Kanan: hasil, catatan admin, riwayat.
const DETAIL_GRID = 'grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10';

function DetailContent({ detail }: { detail: IAdminReviewDetail }) {
  const { item } = detail;
  const isDecided = item.status !== 'ai_grading' && item.status !== 'in_review';

  return (
    <>
      <DetailHeader detail={detail} actions={<ReviewActions detail={detail} />} />
      <div className={DETAIL_GRID}>
        <aside className="grid min-w-0 content-start gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
          <CasePanel detail={detail} />
        </aside>
        <Reveal offset={12} className="grid min-w-0 content-start gap-6">
          {isDecided ? (
            <DecisionSummary
              item={item}
              review={detail.review}
              lastRevision={detail.lastRevision}
              revisionFootnote="Menunggu peserta mengirim ulang. Submission ulang kembali ke antrean reviewer."
            />
          ) : (
            <PendingPanel item={item} />
          )}
          <AdminNotes detail={detail} />
          <EventTimeline events={detail.events} />
        </Reveal>
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8" role="status" aria-label="Memuat">
      <div className="grid gap-3 border-b border-line pb-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-16 w-full rounded-card" />
      </div>
      <div className={DETAIL_GRID}>
        <Skeleton className="h-96 rounded-card" />
        <div className="grid content-start gap-4">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </div>
    </div>
  );
}

// Detail penilaian (CONTEXT.md 4.13): submission, hasil per kriteria, dan aksi admin.
export function ReviewDetailView({ id }: { id: string }) {
  const { data: detail, isLoading, isError, refetch } = useAdminReview(id);
  const backHref = detail ? `${PATHS.adminReviews}?tier=${detail.item.tier}` : PATHS.adminReviews;

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8">
      <Link
        href={backHref}
        className="group flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Penilaian
      </Link>

      {isLoading ? (
        <DetailSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !detail ? (
        <EmptyState
          icon={SearchX}
          title="Penilaian tidak ditemukan"
          description="Submission ini tidak ada, atau belum dikirim untuk dinilai."
          action={
            <Button asChild size="pill">
              <Link href={PATHS.adminReviews}>Kembali ke Penilaian</Link>
            </Button>
          }
        />
      ) : (
        <DetailContent detail={detail} />
      )}
    </div>
  );
}
