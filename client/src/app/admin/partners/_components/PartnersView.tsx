'use client';

import { useState } from 'react';
import { Handshake, Plus, SearchX, UserPlus } from 'lucide-react';

import { ConfirmDialog, EmptyState, ErrorState, Skeleton } from '@/components';
import { FilterTabs, PageHeading, SearchToolbar } from '@/components/student';
import { Button } from '@/components/ui';
import { REVIEW_SLA_BUSINESS_DAYS } from '@/constants/review';
import { usePartnerDirectory, useSetReviewerStatus } from '@/hooks/useAdminPartners';
import {
  ADMIN_PARTNER_ALL,
  REVIEWER_SORT_OPTIONS,
  REVIEWER_STATUS_OPTIONS,
  useAdminPartnerFilters,
} from '@/hooks/useAdminPartnerFilters';
import { cn } from '@/lib/utils';
import type { IAdminPartner, IAdminPartnerDirectory, IAdminReviewer } from '@/types';
import { PartnerFormDialog } from './PartnerFormDialog';
import { PartnerList } from './PartnerList';
import { ReviewerFormDialog } from './ReviewerFormDialog';
import { ReviewerList } from './ReviewerList';

function DirectoryStats({ directory }: { directory: IAdminPartnerDirectory }) {
  const active = directory.reviewers.filter((reviewer) => reviewer.isActive);
  const days = directory.reviewers.flatMap((reviewer) =>
    reviewer.averageReviewDays === null ? [] : [reviewer.averageReviewDays]
  );
  const averageDays =
    days.length > 0 ? days.reduce((total, value) => total + value, 0) / days.length : null;
  const isSlow = averageDays !== null && averageDays > REVIEW_SLA_BUSINESS_DAYS;
  const stats = [
    { label: 'Mitra', value: String(directory.partners.length) },
    { label: 'Reviewer aktif', value: String(active.length) },
    {
      label: 'Menunggu review',
      value: String(directory.partners.reduce((total, item) => total + item.pendingReviewCount, 0)),
    },
    {
      label: 'Rata-rata waktu review',
      value:
        averageDays === null
          ? '-'
          : `${averageDays.toLocaleString('id-ID', { maximumFractionDigits: 1 })} hari`,
      isHighlighted: isSlow,
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

function DirectorySkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Memuat">
      <Skeleton className="h-[5.25rem] rounded-card" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-80 rounded-card" />
    </div>
  );
}

type TDialog = 'partner' | 'reviewer' | 'status' | null;

// Reviewer & Mitra (CONTEXT.md 4.13): perusahaan mitra, praktisinya, dan case yang mereka nilai.
export function PartnersView() {
  const { data: directory, isLoading, isError, refetch } = usePartnerDirectory();
  const filters = useAdminPartnerFilters(directory);
  const setStatus = useSetReviewerStatus();
  const [dialog, setDialog] = useState<TDialog>(null);
  // Target dialog disimpan terpisah agar isi dialog tidak berubah selama animasi menutup.
  const [partnerTarget, setPartnerTarget] = useState<IAdminPartner | null>(null);
  const [reviewerTarget, setReviewerTarget] = useState<IAdminReviewer | null>(null);
  const close = () => setDialog(null);
  const isPartnerTab = filters.tab === 'partners';

  const openPartner = (partner: IAdminPartner | null) => {
    setPartnerTarget(partner);
    setDialog('partner');
  };
  const openStatusDialog = (reviewer: IAdminReviewer) => {
    setReviewerTarget(reviewer);
    setDialog('status');
  };

  const statusReviewer = reviewerTarget;
  // Reviewer yang masih memegang submission tidak bisa dinonaktifkan; dialog hanya menjelaskan.
  const isStatusBlocked = !!statusReviewer?.isActive && statusReviewer.pendingCount > 0;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <PageHeading
        title="Reviewer & Mitra"
        description="Perusahaan mitra penyedia brief B2B dan praktisi mereka yang menilai submission. Reviewer hanya bisa menilai case yang ditugaskan kepadanya."
        action={
          <Button
            size="pill"
            onClick={() => (isPartnerTab ? openPartner(null) : setDialog('reviewer'))}
            disabled={!directory}
          >
            {isPartnerTab ? <Plus className="size-4" /> : <UserPlus className="size-4" />}
            {isPartnerTab ? 'Tambah mitra' : 'Tambah reviewer'}
          </Button>
        }
      />

      {isLoading ? (
        <DirectorySkeleton />
      ) : isError || !directory ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <DirectoryStats directory={directory} />

          <section
            aria-label={isPartnerTab ? 'Daftar mitra' : 'Daftar reviewer'}
            className="grid gap-4"
          >
            <FilterTabs
              ariaLabel="Mitra atau reviewer"
              options={[
                { value: 'partners', label: 'Mitra', count: directory.partners.length },
                { value: 'reviewers', label: 'Reviewer', count: directory.reviewers.length },
              ]}
              value={filters.tab}
              onChange={filters.setTab}
              className="w-fit"
            />

            {/* Mitra masih sedikit, jadi pencarian dan filter hanya untuk tab reviewer. */}
            {!isPartnerTab && (
              <SearchToolbar
                search={filters.searchInput}
                onSearchChange={filters.setSearchInput}
                searchPlaceholder="Cari nama, email, atau jabatan"
                sortOptions={REVIEWER_SORT_OPTIONS}
                sort={filters.sort}
                onSortChange={filters.setSort}
                filterSections={[
                  {
                    id: 'partner',
                    label: 'Mitra',
                    options: filters.partnerOptions,
                    value: filters.partnerId,
                    onChange: filters.setPartnerId,
                  },
                  {
                    id: 'status',
                    label: 'Status',
                    options: REVIEWER_STATUS_OPTIONS,
                    value: filters.status,
                    onChange: filters.setStatus,
                  },
                ]}
                onResetFilters={() => {
                  filters.setPartnerId(ADMIN_PARTNER_ALL);
                  filters.setStatus('all');
                }}
              />
            )}

            {(isPartnerTab ? filters.partners : filters.reviewers).length === 0 ? (
              filters.hasFilters ? (
                <EmptyState
                  icon={SearchX}
                  title={
                    isPartnerTab ? 'Tidak ada mitra yang cocok' : 'Tidak ada reviewer yang cocok'
                  }
                  description="Coba kata kunci lain, atau hapus filter."
                  action={
                    <Button variant="outline" size="pill" onClick={filters.resetFilters}>
                      Hapus filter
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Handshake}
                  title={isPartnerTab ? 'Belum ada mitra' : 'Belum ada reviewer'}
                  description={
                    isPartnerTab
                      ? 'Tambahkan perusahaan mitra sebelum membuat B2B case.'
                      : 'Tambahkan praktisi dari mitra, lalu atur case yang ia nilai.'
                  }
                />
              )
            ) : isPartnerTab ? (
              <PartnerList
                partners={filters.partners}
                onEdit={openPartner}
                onShowReviewers={filters.showPartnerReviewers}
              />
            ) : (
              <ReviewerList
                reviewers={filters.reviewers}
                cases={directory.cases}
                onToggleStatus={openStatusDialog}
              />
            )}
          </section>

          <PartnerFormDialog
            isOpen={dialog === 'partner'}
            onOpenChange={(isOpen) => !isOpen && close()}
            partner={partnerTarget}
          />
          <ReviewerFormDialog
            isOpen={dialog === 'reviewer'}
            onOpenChange={(isOpen) => !isOpen && close()}
            partners={directory.partners}
            defaultPartnerId={filters.partnerId === ADMIN_PARTNER_ALL ? null : filters.partnerId}
          />
          <ConfirmDialog
            isOpen={dialog === 'status'}
            onOpenChange={(isOpen) => !isOpen && close()}
            title={
              isStatusBlocked
                ? 'Belum bisa dinonaktifkan'
                : statusReviewer?.isActive
                  ? 'Nonaktifkan reviewer?'
                  : 'Aktifkan reviewer?'
            }
            description={
              isStatusBlocked
                ? `${statusReviewer?.name} masih memegang ${statusReviewer?.pendingCount} submission yang menunggu review. Pindahkan dulu lewat Ganti reviewer di menu Penilaian.`
                : statusReviewer?.isActive
                  ? `${statusReviewer.name} tidak bisa masuk ke portal reviewer dan tidak menerima submission baru. Riwayat penilaiannya tetap tersimpan.`
                  : `${statusReviewer?.name ?? 'Reviewer'} bisa masuk lagi dan menilai case yang ditugaskan kepadanya.`
            }
            confirmLabel={
              isStatusBlocked ? 'Mengerti' : statusReviewer?.isActive ? 'Nonaktifkan' : 'Aktifkan'
            }
            isPending={setStatus.isPending}
            onConfirm={() => {
              if (!statusReviewer || isStatusBlocked) return close();
              setStatus.mutate(
                { id: statusReviewer.id, payload: { isActive: !statusReviewer.isActive } },
                { onSuccess: close }
              );
            }}
          />
        </>
      )}
    </div>
  );
}
