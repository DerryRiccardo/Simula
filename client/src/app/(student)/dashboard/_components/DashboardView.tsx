'use client';

import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from '@/components';
import { CaseCard, EnrollmentList, SectionTitle } from '@/components/student';
import { Button } from '@/components/ui';
import { FIELD_BY_KEY } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import { useCurrentUser } from '@/hooks/useAuth';
import { useDashboardSummary } from '@/hooks/useLearning';
import { DashboardHeader } from './DashboardHeader';
import { JourneyCard } from './JourneyCard';
import { OverviewStats } from './OverviewStats';
import { WelcomeBanner } from './WelcomeBanner';

// Kolom utama fleksibel + rel kanan tetap, agar kartu Perjalanan tidak ikut melebar.
const MAIN_GRID = 'grid gap-8 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:gap-8';

function DashboardSkeleton() {
  return (
    <div className="grid gap-10" role="status" aria-label="Memuat">
      <div className={MAIN_GRID}>
        <div className="grid min-w-0 grid-cols-1 content-start gap-8">
          <Skeleton className="h-[8.5rem] rounded-card" />
          <ListSkeleton count={3} />
        </div>
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

const joinLabels = (labels: string[]) =>
  labels.length <= 1
    ? (labels[0] ?? '')
    : `${labels.slice(0, -1).join(', ')} dan ${labels[labels.length - 1]}`;

export function DashboardView() {
  const { user } = useCurrentUser();
  const { data: summary, isLoading, isError, refetch } = useDashboardSummary();
  const fieldKeys = user?.fieldKeys ?? [];
  const fieldLabels = fieldKeys.flatMap((key) => FIELD_BY_KEY[key]?.label ?? []);
  const hasAnyStat = (summary?.stats.totalCount ?? 0) > 0;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 pb-8">
      <div className="grid gap-5">
        <DashboardHeader name={user?.name ?? ''} summary={summary} />
        <WelcomeBanner />
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !summary ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <div className={MAIN_GRID}>
            <div className="grid min-w-0 grid-cols-1 content-start gap-8">
              {hasAnyStat && (
                <Reveal offset={8}>
                  <OverviewStats summary={summary} />
                </Reveal>
              )}

              <section aria-labelledby="action-title">
                <SectionTitle
                  title="Perlu tindakanmu"
                  description="Diurutkan dari yang paling mendesak."
                  action={
                    <Link
                      href={PATHS.myCases}
                      className="shrink-0 text-sm font-medium text-brand hover:underline"
                    >
                      Semua case
                    </Link>
                  }
                />
                {summary.actionItems.length === 0 ? (
                  <EmptyState
                    icon={Compass}
                    title="Belum ada case yang perlu dikerjakan"
                    description="Pilih case berikutnya. AI Case Study gratis dan bisa selesai dalam satu sore."
                    action={
                      <Button asChild size="pill">
                        <Link href={`${PATHS.cases}?tier=ai`}>Pilih AI Case</Link>
                      </Button>
                    }
                  />
                ) : (
                  <EnrollmentList items={summary.actionItems} isFirstPrimary isTable={false} />
                )}
              </section>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <Reveal offset={8} delay={0.08}>
                <JourneyCard summary={summary} fieldKeys={fieldKeys} />
              </Reveal>
            </aside>
          </div>

          {summary.recommendations.length > 0 && (
            <section className="border-t border-line pt-10">
              <SectionTitle
                title="Rekomendasi untukmu"
                description={
                  fieldLabels.length > 0
                    ? `Case yang belum kamu ambil, diutamakan dari bidang ${joinLabels(fieldLabels)}.`
                    : undefined
                }
                action={
                  <Link
                    href={PATHS.cases}
                    className="group flex shrink-0 items-center gap-1 text-sm font-medium text-brand"
                  >
                    Lihat semua
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                }
              />
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {summary.recommendations.map((item, index) => (
                  <Reveal key={item.id} as="li" offset={12} delay={index * 0.06}>
                    <CaseCard item={item} isRecommended={fieldKeys.includes(item.fieldKey)} />
                  </Reveal>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
