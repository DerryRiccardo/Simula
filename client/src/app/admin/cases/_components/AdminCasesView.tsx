'use client';

import Link from 'next/link';
import { FolderPlus, Plus, SearchX } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { EmptyState, ErrorState, Skeleton } from '@/components';
import { FilterTabs, PageHeading, SearchToolbar } from '@/components/student';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useAdminCases } from '@/hooks/useAdmin';
import {
  ADMIN_CASE_SORT_OPTIONS,
  ADMIN_STATUS_OPTIONS,
  ADMIN_TIER_OPTIONS,
  useAdminCaseFilters,
} from '@/hooks/useAdminCaseFilters';
import { cn } from '@/lib/utils';
import type { IAdminCaseSummary } from '@/types';
import { ADMIN_CASE_GRID, AdminCaseRow } from './AdminCaseRow';

/** Judul mengikuti sub-menu Case yang dibuka (tier atau draft). */
const HEADING = {
  all: {
    title: 'Kelola case',
    description:
      'Semua case dan rubrik disusun admin. AI menilai AI Case Study, praktisi mitra menilai B2B Case Study.',
  },
  ai: {
    title: 'AI Case Study',
    description: 'Case gratis yang dinilai AI dengan rubrik dari admin. Slot harus bisa dibaca AI.',
  },
  b2b: {
    title: 'B2B Case Study',
    description:
      'Case berbayar dari brief perusahaan mitra, dinilai praktisi mitra dalam 5 hari kerja.',
  },
  draft: {
    title: 'Draft',
    description: 'Case yang belum terbit dan hanya terlihat oleh admin.',
  },
};

function CaseStats({ cases }: { cases: IAdminCaseSummary[] }) {
  const stats = [
    { label: 'Total case', value: cases.length },
    { label: 'Terbit', value: cases.filter((item) => item.status === 'published').length },
    { label: 'Draft', value: cases.filter((item) => item.status === 'draft').length },
    {
      label: 'Menunggu review',
      value: cases.reduce((total, item) => total + item.pendingReviewCount, 0),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white px-5 py-4">
          <dt className="text-xs text-ink-subtle">{stat.label}</dt>
          <dd className="mt-1 text-[1.75rem] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CaseTable({ items }: { items: IAdminCaseSummary[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <div
        className={cn(
          'hidden border-b border-line bg-surface-soft/60 px-5 py-2.5 text-xs font-medium text-ink-subtle',
          ADMIN_CASE_GRID
        )}
        aria-hidden="true"
      >
        <span>Case</span>
        <span>Status</span>
        <span>Peserta</span>
        <span>Diubah</span>
        <span className="text-right">Aksi</span>
      </div>
      <ol className="divide-y divide-line">
        {items.map((item, index) => (
          <Reveal key={item.id} as="li" offset={8} delay={Math.min(index * 0.03, 0.24)}>
            <AdminCaseRow item={item} />
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

// Daftar case (CONTEXT.md 4.11): semua case AI dan B2B, draft maupun terbit.
export function AdminCasesView() {
  const { data: cases, isLoading, isError, refetch } = useAdminCases();
  const filters = useAdminCaseFilters(cases);
  const heading =
    filters.status === 'draft' && filters.tier === 'all' ? HEADING.draft : HEADING[filters.tier];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <PageHeading
        title={heading.title}
        description={heading.description}
        action={
          <Button asChild size="pill">
            <Link href={PATHS.adminCaseNew}>
              <Plus className="size-4" />
              Buat case baru
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-6" role="status" aria-label="Memuat">
          <Skeleton className="h-[5.25rem] rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      ) : isError || !cases ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <CaseStats cases={filters.tierCases} />

          <section aria-label="Daftar case" className="grid gap-4">
            <FilterTabs
              ariaLabel="Status case"
              options={ADMIN_STATUS_OPTIONS.map((option) => ({
                ...option,
                count: filters.statusCounts[option.value],
              }))}
              value={filters.status}
              onChange={filters.setStatus}
              className="w-fit"
            />
            <SearchToolbar
              search={filters.searchInput}
              onSearchChange={filters.setSearchInput}
              searchPlaceholder="Cari judul case atau mitra"
              sortOptions={ADMIN_CASE_SORT_OPTIONS}
              sort={filters.sort}
              onSortChange={filters.setSort}
              filterSections={[
                {
                  id: 'tier',
                  label: 'Tier',
                  options: ADMIN_TIER_OPTIONS,
                  value: filters.tier,
                  onChange: filters.setTier,
                },
              ]}
              onResetFilters={() => filters.setTier('all')}
            />

            {filters.items.length > 0 ? (
              <CaseTable items={filters.items} />
            ) : filters.hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="Tidak ada case yang cocok"
                description="Coba kata kunci lain, atau tampilkan semua tier dan status."
                action={
                  <Button variant="outline" size="pill" onClick={filters.resetFilters}>
                    Hapus filter
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={FolderPlus}
                title="Belum ada case"
                description="Buat case pertama: info umum, brief, slot deliverable, dan rubrik."
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
