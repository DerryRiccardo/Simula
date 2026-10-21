'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FolderPlus, PowerOff, SearchX, UserX } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { FilterTabs, SearchToolbar } from '@/components/student';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { usePartnerDirectory, useToggleReviewerCase } from '@/hooks/useAdminPartners';
import {
  ASSIGNMENT_SORT_OPTIONS,
  ASSIGNMENT_STATUS_OPTIONS,
  useReviewerAssignmentFilters,
} from '@/hooks/useReviewerAssignmentFilters';
import { getInitials } from '@/lib/formatters';
import type { IAdminPartnerCase, IAdminReviewer } from '@/types';
import { AssignmentTable } from './AssignmentTable';

function ReviewerSummary({ reviewer }: { reviewer: IAdminReviewer }) {
  const stats = [
    { label: 'Case ditugaskan', value: String(reviewer.caseIds.length) },
    { label: 'Menunggu dinilai', value: String(reviewer.pendingCount) },
    { label: 'Sudah diputuskan', value: String(reviewer.decidedCount) },
    {
      label: 'Rata-rata waktu review',
      value:
        reviewer.averageReviewDays === null
          ? '-'
          : `${reviewer.averageReviewDays.toLocaleString('id-ID')} hari`,
    },
  ];
  return (
    <header className="grid gap-6">
      <div className="flex items-center gap-4">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {getInitials(reviewer.name)}
        </span>
        <div className="min-w-0">
          <h1 className="text-[1.625rem] leading-[1.2] tracking-[-0.02em] md:text-[2rem]">
            {reviewer.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {reviewer.jobTitle}, {reviewer.partnerName}
            <span className="ml-2 text-ink-subtle">{reviewer.email}</span>
          </p>
        </div>
      </div>
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
    </header>
  );
}

function AssignmentSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Memuat">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-[5.25rem] rounded-card" />
      <Skeleton className="h-80 rounded-card" />
    </div>
  );
}

function AssignmentContent({
  reviewer,
  cases,
}: {
  reviewer: IAdminReviewer;
  cases: IAdminPartnerCase[];
}) {
  const filters = useReviewerAssignmentFilters(reviewer, cases);
  const toggle = useToggleReviewerCase();
  const [pendingCaseId, setPendingCaseId] = useState<string | null>(null);
  const partnerCaseCount = cases.filter((item) => item.partnerId === reviewer.partnerId).length;

  const handleToggle = (item: IAdminPartnerCase, isAssigned: boolean) => {
    setPendingCaseId(item.id);
    toggle.mutate(
      { reviewer, caseId: item.id, caseTitle: item.title, isAssigned },
      { onSettled: () => setPendingCaseId(null) }
    );
  };

  return (
    <>
      <ReviewerSummary reviewer={reviewer} />

      {!reviewer.isActive && (
        <div className="flex items-start gap-3 rounded-card border border-line bg-surface-soft/60 px-4 py-3 text-sm">
          <PowerOff className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
          <p className="text-ink-muted">
            <span className="font-medium text-ink">Reviewer ini nonaktif.</span> Aktifkan dulu dari
            daftar reviewer untuk mengubah penugasannya.
          </p>
        </div>
      )}

      <section aria-labelledby="assignment-title" className="grid gap-4">
        <div>
          <h2 id="assignment-title" className="text-lg tracking-[-0.01em] md:text-lg">
            Penugasan case
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            B2B case milik {reviewer.partnerName}. Reviewer hanya bisa menilai submission dari case
            yang ditugaskan kepadanya; draft juga bisa ditugaskan sebelum terbit.
          </p>
        </div>

        <FilterTabs
          ariaLabel="Saring penugasan"
          options={[
            { value: 'all', label: 'Semua', count: filters.filterCounts.all },
            { value: 'assigned', label: 'Ditugaskan', count: filters.filterCounts.assigned },
            {
              value: 'unassigned',
              label: 'Belum ditugaskan',
              count: filters.filterCounts.unassigned,
            },
          ]}
          value={filters.filter}
          onChange={filters.setFilter}
          className="w-fit"
        />
        <SearchToolbar
          search={filters.searchInput}
          onSearchChange={filters.setSearchInput}
          searchPlaceholder="Cari judul case"
          sortOptions={ASSIGNMENT_SORT_OPTIONS}
          sort={filters.sort}
          onSortChange={filters.setSort}
          filterSections={[
            {
              id: 'status',
              label: 'Status case',
              options: ASSIGNMENT_STATUS_OPTIONS,
              value: filters.status,
              onChange: filters.setStatus,
            },
          ]}
          onResetFilters={() => filters.setStatus('all')}
        />

        {filters.items.length > 0 ? (
          <AssignmentTable
            items={filters.items}
            isAssigned={filters.isAssigned}
            pendingCaseId={pendingCaseId}
            isDisabled={!reviewer.isActive}
            onToggle={handleToggle}
          />
        ) : partnerCaseCount === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title={`${reviewer.partnerName} belum punya B2B case`}
            description="Buat B2B case dan pilih mitra ini di bagian Komersial, lalu kembali ke sini untuk menugaskan reviewer."
            action={
              <Button asChild size="pill">
                <Link href={PATHS.adminCaseNew}>Buat case baru</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title="Tidak ada case yang cocok"
            description="Coba kata kunci lain, atau tampilkan semua case."
            action={
              <Button variant="outline" size="pill" onClick={filters.resetFilters}>
                Hapus filter
              </Button>
            }
          />
        )}
      </section>
    </>
  );
}

// Penugasan per reviewer (CONTEXT.md 4.13): daftar B2B case mitranya dengan tombol Assign/Lepas.
export function ReviewerAssignmentView({ id }: { id: string }) {
  const { data: directory, isLoading, isError, refetch } = usePartnerDirectory();
  const reviewer = directory?.reviewers.find((item) => item.id === id);
  const backHref = `${PATHS.adminPartners}?tab=reviewers`;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <Link
        href={backHref}
        className="group flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Daftar reviewer
      </Link>

      {isLoading ? (
        <AssignmentSkeleton />
      ) : isError || !directory ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !reviewer ? (
        <EmptyState
          icon={UserX}
          title="Reviewer tidak ditemukan"
          description="Reviewer ini tidak ada, atau tautannya sudah tidak berlaku."
          action={
            <Button asChild size="pill">
              <Link href={backHref}>Kembali ke daftar reviewer</Link>
            </Button>
          }
        />
      ) : (
        <AssignmentContent reviewer={reviewer} cases={directory.cases} />
      )}
    </div>
  );
}
