'use client';

import { ClipboardCheck, SearchX } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { EmptyState, ErrorState, Skeleton } from '@/components';
import { FilterTabs, PageHeading, SearchToolbar } from '@/components/student';
import { Button } from '@/components/ui';
import { REVIEW_SLA_BUSINESS_DAYS } from '@/constants/review';
import { useAdminReviews } from '@/hooks/useAdminReviews';
import {
  ADMIN_REVIEW_ALL_CASES,
  ADMIN_REVIEW_SORT_OPTIONS,
  useAdminReviewFilters,
  type TAdminReviewTier,
} from '@/hooks/useAdminReviewFilters';
import { cn } from '@/lib/utils';
import type { IAdminReviewItem } from '@/types';
import { AiCaseStats } from './AiCaseStats';
import { REVIEW_GRID, ReviewRow } from './ReviewRow';
import { ReviewStats } from './ReviewStats';

/** Judul mengikuti sub-menu Penilaian yang dibuka. */
const HEADING: Record<TAdminReviewTier, { title: string; description: string }> = {
  all: {
    title: 'Penilaian',
    description:
      'Semua submission yang sedang atau sudah dinilai, oleh AI maupun praktisi mitra. Identitas peserta hanya terlihat di panel admin.',
  },
  ai: {
    title: 'Penilaian AI Case',
    description:
      'Hasil penilaian AI per percobaan. Tandai hasil yang janggal sebagai bahan evaluasi rubrik dan prompt.',
  },
  b2b: {
    title: 'Review B2B Case',
    description: `Review praktisi mitra, dengan SLA ${REVIEW_SLA_BUSINESS_DAYS} hari kerja sejak submit terakhir.`,
  },
};

function ReviewTable({ items }: { items: IAdminReviewItem[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <div
        className={cn(
          'hidden border-b border-line bg-surface-soft/60 px-5 py-2.5 text-xs font-medium text-ink-subtle',
          REVIEW_GRID
        )}
        aria-hidden="true"
      >
        <span>Peserta dan case</span>
        <span>Status</span>
        <span>Skor</span>
        <span>Waktu</span>
        <span className="text-right">Aksi</span>
      </div>
      <ol className="divide-y divide-line">
        {items.map((item, index) => (
          <Reveal key={item.id} as="li" offset={8} delay={Math.min(index * 0.03, 0.24)}>
            <ReviewRow item={item} />
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Memuat">
      <Skeleton className="h-[5.25rem] rounded-card" />
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

// Menu Penilaian (CONTEXT.md 4.13): pengawasan penilaian AI dan review B2B dalam satu daftar.
export function ReviewsView() {
  const { data, isLoading, isError, refetch } = useAdminReviews();
  const filters = useAdminReviewFilters(data?.items);
  const heading = HEADING[filters.tier];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <PageHeading title={heading.title} description={heading.description} />

      {isLoading ? (
        <ReviewsSkeleton />
      ) : isError || !data ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <ReviewStats tier={filters.tier} items={filters.tierItems} />

          <section aria-label="Daftar penilaian" className="grid gap-4">
            <FilterTabs
              ariaLabel="Status penilaian"
              options={filters.filterOptions}
              value={filters.filter}
              onChange={filters.setFilter}
              className="w-fit"
            />
            <SearchToolbar
              search={filters.searchInput}
              onSearchChange={filters.setSearchInput}
              searchPlaceholder="Cari nama, email, atau judul case"
              sortOptions={ADMIN_REVIEW_SORT_OPTIONS}
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
              onResetFilters={() => filters.setCaseId(ADMIN_REVIEW_ALL_CASES)}
            />

            {filters.items.length > 0 ? (
              <ReviewTable items={filters.items} />
            ) : filters.hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="Tidak ada penilaian yang cocok"
                description="Coba kata kunci lain, atau tampilkan semua status dan case."
                action={
                  <Button variant="outline" size="pill" onClick={filters.resetFilters}>
                    Hapus filter
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={ClipboardCheck}
                title="Belum ada submission"
                description="Submission peserta muncul di sini begitu dikirim untuk dinilai."
              />
            )}
          </section>

          {filters.tier === 'ai' && <AiCaseStats stats={data.aiCaseStats} />}
        </>
      )}
    </div>
  );
}
