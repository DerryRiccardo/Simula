'use client';

import Link from 'next/link';
import { ArrowLeft, CreditCard, Lock, SearchX } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { CaseProgressHeader, SubmittedSummary } from '@/components/student';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useCaseWorkspace } from '@/hooks/useCaseWork';
import type { ICaseWorkspace, TEnrollmentStatus } from '@/types';
import { BriefPanel } from './BriefPanel';
import { RevisionNotice } from './RevisionNotice';
import { StartWorkPanel } from './StartWorkPanel';
import { SubmissionForm } from './SubmissionForm';
import { SubmissionStatusNotice } from './SubmissionStatusNotice';

const EDITABLE_STATUSES: TEnrollmentStatus[] = ['in_progress', 'revision_requested'];

// Kolom brief fleksibel + panel submission tetap di kanan (CONTEXT.md 4.7, layar lebar).
const BODY_GRID = 'grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10';

function WorkSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8" role="status" aria-label="Memuat">
      <div className="grid gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <div className={BODY_GRID}>
        <div className="grid content-start gap-4">
          <Skeleton className="h-10 w-80 rounded-control" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-[28rem] rounded-card" />
      </div>
    </div>
  );
}

function Workspace({ workspace }: { workspace: ICaseWorkspace }) {
  const { enrollment, brief, caseInfo, revision } = workspace;
  if (!enrollment) return null;
  const isEditable = EDITABLE_STATUSES.includes(enrollment.status);

  return (
    <>
      <CaseProgressHeader caseInfo={caseInfo} enrollment={enrollment} />
      {revision && isEditable && <RevisionNotice revision={revision} />}
      <div className={BODY_GRID}>
        <div className="min-w-0">
          <BriefPanel workspace={workspace} />
        </div>
        <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="Submission">
          {isEditable ? (
            <SubmissionForm
              key={enrollment.id}
              enrollmentId={enrollment.id}
              slots={brief.slots}
              draft={workspace.draft}
              previousSubmission={workspace.submission}
            />
          ) : (
            <SubmittedSummary
              submission={workspace.submission}
              slots={brief.slots}
              notice={<SubmissionStatusNotice slug={caseInfo.slug} status={enrollment.status} />}
            />
          )}
        </aside>
      </div>
    </>
  );
}

export function WorkView({ slug }: { slug: string }) {
  const { data: workspace, isLoading, isError, refetch } = useCaseWorkspace(slug);
  const status = workspace?.enrollment?.status;

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
        <WorkSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !workspace ? (
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
      ) : !workspace.enrollment ? (
        <EmptyState
          icon={Lock}
          title="Kamu belum mengambil case ini"
          description="Brief lengkap terbuka setelah kamu memulai (AI) atau membeli (B2B) case ini."
          action={
            <Button asChild size="pill">
              <Link href={PATHS.caseDetail(slug)}>Lihat detail case</Link>
            </Button>
          }
        />
      ) : status === 'pending_payment' ? (
        <EmptyState
          icon={CreditCard}
          title="Selesaikan pembayaran dulu"
          description="Brief dan form submission terbuka setelah pembayaran terkonfirmasi."
          action={
            <Button asChild size="pill">
              <Link href={PATHS.caseCheckout(slug)}>Bayar sekarang</Link>
            </Button>
          }
        />
      ) : status === 'not_started' ? (
        <StartWorkPanel workspace={workspace} />
      ) : (
        <Workspace workspace={workspace} />
      )}
    </div>
  );
}
