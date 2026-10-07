'use client';

import Link from 'next/link';
import { ArrowLeft, FileClock, Lock, SearchX } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { Reveal } from '@/components/animated';
import { CaseProgressHeader, CertificateCard, SubmittedSummary } from '@/components/student';
import { Button } from '@/components/ui';
import { ENROLLMENT_STATUS } from '@/constants/enrollmentStatus';
import { PATHS } from '@/constants/paths';
import { useCaseResult } from '@/hooks/useCaseResult';
import type { ICaseResult, IEnrollment, IReviewResult } from '@/types';
import { CriteriaBreakdown } from './CriteriaBreakdown';
import { FeedbackSection } from './FeedbackSection';
import { InterviewPanel } from './InterviewPanel';
import { NextStepPanel } from './NextStepPanel';
import { RetryPanel } from './RetryPanel';
import { ScoreSummary } from './ScoreSummary';
import { SkillGapSummary } from './SkillGapSummary';

// Kolom hasil fleksibel + panel aksi di kanan, sama dengan halaman status.
const RESULT_GRID = 'grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12';

function ResultSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8" role="status" aria-label="Memuat">
      <div className="grid gap-3 border-b border-line pb-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className={RESULT_GRID}>
        <div className="grid content-start gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-72 rounded-card" />
        </div>
        <Skeleton className="h-96 rounded-card" />
      </div>
    </div>
  );
}

interface ResultContentProps {
  result: ICaseResult;
  enrollment: IEnrollment;
  review: IReviewResult;
}

function ResultContent({ result, enrollment, review }: ResultContentProps) {
  const { caseInfo, certificate, shareConsent, submission, slots } = result;

  return (
    <>
      <CaseProgressHeader caseInfo={caseInfo} enrollment={enrollment} />

      <div className={RESULT_GRID}>
        <div className="grid min-w-0 content-start gap-10">
          <Reveal offset={12}>
            <ScoreSummary result={result} review={review} />
          </Reveal>
          {caseInfo.tier === 'ai' && (
            <Reveal offset={12} delay={0.06}>
              <SkillGapSummary review={review} />
            </Reveal>
          )}
          <Reveal offset={12} delay={0.06}>
            <CriteriaBreakdown review={review} />
          </Reveal>
          <Reveal offset={12} delay={0.12}>
            <FeedbackSection review={review} />
          </Reveal>
        </div>

        <aside className="grid content-start gap-4">
          {certificate && <CertificateCard certificate={certificate} />}
          {shareConsent && caseInfo.partner && (
            <InterviewPanel
              enrollmentId={enrollment.id}
              partnerName={caseInfo.partner.name}
              reviewerRole={review.reviewerRole}
              consent={shareConsent}
            />
          )}
          {!review.isPassed && (
            <RetryPanel
              slug={caseInfo.slug}
              enrollmentId={enrollment.id}
              tier={caseInfo.tier}
              canRetry={result.canRetry}
            />
          )}
          <NextStepPanel caseInfo={caseInfo} review={review} />
          {submission && <SubmittedSummary submission={submission} slots={slots} />}
        </aside>
      </div>
    </>
  );
}

function ResultBody({ slug, result }: { slug: string; result: ICaseResult }) {
  const { enrollment, review } = result;

  if (!enrollment) {
    return (
      <EmptyState
        icon={Lock}
        title="Kamu belum mengambil case ini"
        description="Hasil penilaian hanya tersedia untuk case yang sudah kamu kerjakan."
        action={
          <Button asChild size="pill">
            <Link href={PATHS.caseDetail(slug)}>Lihat detail case</Link>
          </Button>
        }
      />
    );
  }

  if (!review) {
    const meta = ENROLLMENT_STATUS[enrollment.status];
    return (
      <EmptyState
        icon={FileClock}
        title="Hasil belum keluar"
        description={`Status case ini: ${meta.label}. Hasil muncul di sini setelah submission dinilai.`}
        action={
          <Button asChild size="pill">
            <Link href={meta.getHref(enrollment.caseSummary)}>{meta.actionLabel}</Link>
          </Button>
        }
      />
    );
  }

  return <ResultContent result={result} enrollment={enrollment} review={review} />;
}

export function ResultView({ slug }: { slug: string }) {
  const { data: result, isLoading, isError, refetch } = useCaseResult(slug);

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
        <ResultSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !result ? (
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
        <ResultBody slug={slug} result={result} />
      )}
    </div>
  );
}
