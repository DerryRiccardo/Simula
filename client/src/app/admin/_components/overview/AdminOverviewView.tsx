'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { ErrorState, ListSkeleton, Skeleton } from '@/components';
import { SectionTitle } from '@/components/student';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useAdminOverview } from '@/hooks/useAdmin';
import { formatLongDate } from '@/lib/formatters';
import type { IAdminOverview } from '@/types';
import { ActionList } from './ActionList';
import { ActivityFeed } from './ActivityFeed';
import { CatalogSummary } from './CatalogSummary';
import { OverviewStats } from './OverviewStats';

// Kolom utama fleksibel + rel kanan tetap. Rel baru di samping mulai xl: di lebar lg kolom utama
// tinggal ±330px setelah sidebar, terlalu sempit untuk empat angka utama.
const MAIN_GRID = 'grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]';
const RAIL_GRID = 'grid min-w-0 content-start gap-6 md:grid-cols-2 xl:grid-cols-1';

/** Satu kalimat tentang hal paling mendesak hari ini. */
function getSummaryLine({ stats, actionItems }: IAdminOverview) {
  if (actionItems.length === 0)
    return 'Semua berjalan normal. Tidak ada yang perlu ditindaklanjuti.';
  const parts = [
    stats.overdueReviewCount > 0 && `${stats.overdueReviewCount} review B2B melewati SLA`,
    actionItems.some((item) => item.kind === 'payment_expiring') &&
      'ada pembayaran yang hampir kedaluwarsa',
  ].filter(Boolean);
  const lead = parts.length > 0 ? `${parts.join(' dan ')}. ` : '';
  return `${lead.charAt(0).toUpperCase()}${lead.slice(1)}${actionItems.length} hal menunggu tindakanmu.`;
}

function RailPanel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-card border border-line bg-white">
      <h2 id={id} className="border-b border-line px-5 py-3.5 text-[0.9375rem] md:text-[0.9375rem]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className={MAIN_GRID} role="status" aria-label="Memuat">
      <div className="grid min-w-0 grid-cols-1 content-start gap-8">
        <Skeleton className="h-[8.5rem] rounded-card" />
        <ListSkeleton count={3} />
      </div>
      <div className={RAIL_GRID}>
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

// Dashboard admin (CONTEXT.md 4.13): angka utama, "Perlu tindakan", katalog, dan aktivitas.
export function AdminOverviewView() {
  const { data: overview, isLoading, isError, refetch } = useAdminOverview();

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 pb-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs text-ink-subtle">{formatLongDate(new Date())}</p>
          <h1 className="mt-2 text-page-title">Ringkasan platform</h1>
          <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
            {overview ? getSummaryLine(overview) : ' '}
          </p>
        </div>
        <Button
          asChild
          size="pill"
          className="shrink-0 self-start active:scale-[0.98] sm:self-auto"
        >
          <Link href={PATHS.adminCaseNew}>
            <Plus />
            Buat case baru
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <OverviewSkeleton />
      ) : isError || !overview ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className={MAIN_GRID}>
          <div className="grid min-w-0 grid-cols-1 content-start gap-8">
            <Reveal offset={8}>
              <OverviewStats stats={overview.stats} />
            </Reveal>

            <section aria-label="Perlu tindakan">
              <SectionTitle
                title="Perlu tindakan"
                description="Diurutkan dari yang paling mendesak."
              />
              <Reveal offset={8} delay={0.04}>
                <ActionList items={overview.actionItems} />
              </Reveal>
            </section>
          </div>

          <aside className={`${RAIL_GRID} xl:sticky xl:top-28 xl:self-start`}>
            <Reveal offset={8} delay={0.08}>
              <RailPanel id="admin-catalog" title="Katalog case">
                <CatalogSummary stats={overview.stats} />
              </RailPanel>
            </Reveal>
            <Reveal offset={8} delay={0.12}>
              <RailPanel id="admin-activity" title="Aktivitas terbaru">
                <ActivityFeed items={overview.activities} />
              </RailPanel>
            </Reveal>
          </aside>
        </div>
      )}
    </div>
  );
}
