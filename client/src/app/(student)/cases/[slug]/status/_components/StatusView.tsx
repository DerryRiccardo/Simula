'use client';

import Link from 'next/link';
import { ArrowLeft, FileClock, Lock, RotateCcw, SearchX, Trophy } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { Button } from '@/components/ui';
import { ENROLLMENT_STATUS } from '@/constants/enrollmentStatus';
import { PATHS } from '@/constants/paths';
import { useAiGradingCompletion, useCaseStatus } from '@/hooks/useCaseStatus';
import type { ICaseStatus, IEnrollment } from '@/types';
import { AiGrading } from './AiGrading';
import { ReviewWaiting, STATUS_GRID } from './ReviewWaiting';

function StatusSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8" role="status" aria-label="Memuat">
      <div className="grid gap-3 border-b border-line pb-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className={STATUS_GRID}>
        <div className="grid content-start gap-4">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

// Halaman ini khusus "Sedang dinilai AI" dan "Menunggu review". Status lain diarahkan ke
// halaman yang tepat.
function OtherStatus({ enrollment }: { enrollment: IEnrollment }) {
  const meta = ENROLLMENT_STATUS[enrollment.status];
  const primaryAction = (
    <Button asChild size="pill">
      <Link href={meta.getHref(enrollment.caseSummary)}>{meta.actionLabel}</Link>
    </Button>
  );

  switch (enrollment.status) {
    case 'revision_requested':
      return (
        <EmptyState
          icon={RotateCcw}
          title="Submission perlu direvisi"
          description="Reviewer mengembalikan submission-mu. Catatan perbaikannya ada di halaman pengerjaan."
          action={primaryAction}
        />
      );
    case 'passed':
    case 'failed':
      return (
        <EmptyState
          icon={Trophy}
          title="Hasil review sudah keluar"
          description="Lihat skor, feedback per kriteria, dan sertifikatmu bila lulus."
          action={primaryAction}
        />
      );
    default:
      return (
        <EmptyState
          icon={FileClock}
          title="Belum ada submission yang direview"
          description={`Status case ini: ${meta.label}. Halaman status aktif setelah kamu mengirim submission.`}
          action={primaryAction}
        />
      );
  }
}

function StatusBody({ slug, status }: { slug: string; status: ICaseStatus }) {
  const { enrollment } = status;
  if (!enrollment) {
    return (
      <EmptyState
        icon={Lock}
        title="Kamu belum mengambil case ini"
        description="Status review hanya tersedia untuk case yang sudah kamu kerjakan."
        action={
          <Button asChild size="pill">
            <Link href={PATHS.caseDetail(slug)}>Lihat detail case</Link>
          </Button>
        }
      />
    );
  }
  if (enrollment.status === 'ai_grading' && status.aiGrading) {
    return <AiGrading status={status} enrollment={enrollment} progress={status.aiGrading} />;
  }
  if (enrollment.status !== 'in_review') return <OtherStatus enrollment={enrollment} />;
  return <ReviewWaiting status={status} enrollment={enrollment} />;
}

export function StatusView({ slug }: { slug: string }) {
  const { data: status, isLoading, isError, refetch } = useCaseStatus(slug);
  useAiGradingCompletion(slug, status?.enrollment?.status);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 pb-10">
      <Link
        href={PATHS.myCases}
        className="group flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Case Saya
      </Link>

      {isLoading ? (
        <StatusSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !status ? (
        <EmptyState
          icon={SearchX}
          title="Case tidak ditemukan"
          description="Case ini mungkin sudah tidak tersedia, atau tautannya salah."
          action={
            <Button asChild size="pill">
              <Link href={PATHS.myCases}>Kembali ke Case Saya</Link>
            </Button>
          }
        />
      ) : (
        <StatusBody slug={slug} status={status} />
      )}
    </div>
  );
}
