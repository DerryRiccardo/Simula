'use client';

import { ClipboardCheck, History, SearchX } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { EmptyState, ErrorState, Skeleton } from '@/components';
import { FilterTabs, PageHeading, SearchToolbar } from '@/components/student';
import { Button } from '@/components/ui';
import { REVIEW_SLA_BUSINESS_DAYS } from '@/constants/review';
import { useCurrentUser } from '@/hooks/useAuth';
import { useReviewerQueue } from '@/hooks/useReviewer';
import { FILTER_ALL_CASES, useQueueFilters } from '@/hooks/useReviewerQueueFilters';
import { getFirstName } from '@/lib/formatters';
import { getReviewUrgency } from '@/lib/review';
import { cn } from '@/lib/utils';
import type { IReviewerQueue, IReviewQueueItem } from '@/types';
import { QUEUE_GRID, QueueRow } from './QueueRow';

function QueueStats({ queue }: { queue: IReviewerQueue }) {
  const urgentCount = queue.pending.filter((item) => getReviewUrgency(item.reviewDueAt)).length;
  const reviewed = queue.history.filter((item) => item.status !== 'revision_requested');
  const stats = [
    { label: 'Menunggu dinilai', value: queue.pending.length },
    {
      label: 'Perlu segera (≤ 1 hari kerja)',
      value: urgentCount,
      isHighlighted: urgentCount > 0,
    },
    { label: 'Sudah dinilai', value: reviewed.length },
    {
      label: 'Direkomendasikan interview',
      value: reviewed.filter((item) => item.isRecommended).length,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white px-5 py-4">
          <dt className="text-xs text-ink-subtle">{stat.label}</dt>
          <dd
            className={cn(
              'mt-1 text-[1.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums',
              stat.isHighlighted ? 'text-brand' : 'text-ink'
            )}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function QueueTable({ items, isPending }: { items: IReviewQueueItem[]; isPending: boolean }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <div
        className={cn(
          'hidden border-b border-line bg-surface-soft/60 px-5 py-2.5 text-xs font-medium text-ink-subtle',
          QUEUE_GRID
        )}
        aria-hidden="true"
      >
        <span>Kandidat dan case</span>
        <span>{isPending ? 'Dikirim' : 'Diputuskan'}</span>
        <span>{isPending ? 'Tenggat review' : 'Keputusan'}</span>
        <span className="text-right">Aksi</span>
      </div>
      <ol className="divide-y divide-line">
        {items.map((item, index) => (
          <Reveal key={item.id} as="li" offset={8} delay={Math.min(index * 0.04, 0.24)}>
            <QueueRow item={item} isPrimary={isPending && index === 0} />
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Memuat">
      <Skeleton className="h-[5.25rem] rounded-card" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}

// Antrean review (CONTEXT.md 4.10): submission B2B yang ditugaskan, kandidat anonim,
// diurutkan dari tenggat SLA paling dekat.
export function QueueView() {
  const { user } = useCurrentUser();
  const { data: queue, isLoading, isError, refetch } = useReviewerQueue();
  const filters = useQueueFilters(queue);
  const { tab, items } = filters;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <PageHeading
        title={user ? `Halo, ${getFirstName(user.name)}` : 'Antrean review'}
        description={`Submission B2B yang ditugaskan kepadamu. Kandidat tampil anonim; nilai dengan rubrik case dalam ${REVIEW_SLA_BUSINESS_DAYS} hari kerja sejak dikirim.`}
      />

      {isLoading ? (
        <QueueSkeleton />
      ) : isError || !queue ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <QueueStats queue={queue} />

          <section aria-label="Daftar submission" className="grid gap-4">
            <FilterTabs
              ariaLabel="Antrean atau riwayat"
              options={[
                { value: 'pending', label: 'Antrean', count: filters.counts.pending },
                { value: 'history', label: 'Riwayat', count: filters.counts.history },
              ]}
              value={tab}
              onChange={filters.setTab}
              className="w-fit"
            />
            <SearchToolbar
              search={filters.searchInput}
              onSearchChange={filters.setSearchInput}
              searchPlaceholder="Cari nomor kandidat atau judul case"
              sortOptions={filters.sortOptions}
              sort={filters.sort}
              onSortChange={filters.setSort}
              filterSections={[
                {
                  id: 'case',
                  label: 'Case',
                  options: filters.caseOptions,
                  value: filters.caseId,
                  onChange: filters.setCaseId,
                },
              ]}
              onResetFilters={() => filters.setCaseId(FILTER_ALL_CASES)}
            />

            {items.length === 0 && filters.hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="Tidak ada submission yang cocok"
                description="Coba nomor kandidat atau judul case lain, atau pilih semua case."
                action={
                  <Button variant="outline" size="pill" onClick={filters.resetFilters}>
                    Hapus filter
                  </Button>
                }
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon={tab === 'pending' ? ClipboardCheck : History}
                title={tab === 'pending' ? 'Antrean kosong' : 'Belum ada riwayat'}
                description={
                  tab === 'pending'
                    ? 'Semua submission sudah kamu putuskan. Submission baru muncul di sini begitu kandidat mengirimnya.'
                    : 'Submission yang sudah kamu nilai atau kembalikan untuk revisi akan tercatat di sini.'
                }
              />
            ) : (
              <QueueTable items={items} isPending={tab === 'pending'} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
