'use client';

import Link from 'next/link';
import { FolderOpen } from 'lucide-react';

import { EmptyState, ErrorState, ListSkeleton } from '@/components';
import {
  EnrollmentList,
  FILTER_ALL,
  FilterTabs,
  PageHeading,
  SearchToolbar,
  type IFilterSection,
} from '@/components/student';
import { Button } from '@/components/ui';
import { STATUS_FILTERS } from '@/constants/enrollmentStatus';
import { FIELD_FILTER_OPTIONS } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import { useMyEnrollments } from '@/hooks/useLearning';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useUrlSearch } from '@/hooks/useUrlSearch';
import { parseOption } from '@/lib/parseOption';
import type { TEnrollmentSort, TTier } from '@/types';

type TTierFilter = TTier | 'all';

const TIER_TABS: { value: TTierFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'ai', label: 'AI Case Study' },
  { value: 'b2b', label: 'B2B Case Study' },
];

const SORT_OPTIONS: { value: TEnrollmentSort; label: string }[] = [
  { value: 'recent', label: 'Terakhir diperbarui' },
  { value: 'deadline', label: 'Tenggat terdekat' },
  { value: 'title', label: 'Judul A-Z' },
];

export function MyCasesView() {
  const { searchParams, setParams } = useUrlParams();
  const tier = parseOption(TIER_TABS, searchParams.get('tier'), 'all');
  const status = parseOption(STATUS_FILTERS, searchParams.get('status'), 'all');
  const field = parseOption(FIELD_FILTER_OPTIONS, searchParams.get('field'), FILTER_ALL);
  const sort = parseOption(SORT_OPTIONS, searchParams.get('sort'), 'recent');
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);

  // Daftar tanpa filter hanya untuk angka di tab; hasilnya ikut ter-cache oleh React Query.
  const { data: allEnrollments } = useMyEnrollments({});
  const {
    data: enrollments,
    isLoading,
    isError,
    refetch,
  } = useMyEnrollments({
    tier: tier === 'all' ? undefined : tier,
    status: status === 'all' ? undefined : status,
    field: field === FILTER_ALL ? undefined : field,
    search: urlSearch || undefined,
    sort,
  });
  const hasFilters = tier !== 'all' || status !== 'all' || field !== FILTER_ALL || urlSearch !== '';

  const tierTabs = TIER_TABS.map((tab) => ({
    ...tab,
    count: allEnrollments?.filter(
      (item) => tab.value === 'all' || item.caseSummary.tier === tab.value
    ).length,
  }));

  const filterSections: IFilterSection[] = [
    {
      id: 'status',
      label: 'Status',
      options: STATUS_FILTERS,
      value: status,
      onChange: (value) => setParams({ status: value === FILTER_ALL ? null : value }),
    },
    {
      id: 'field',
      label: 'Bidang',
      options: FIELD_FILTER_OPTIONS,
      value: field,
      onChange: (value) => setParams({ field: value === FILTER_ALL ? null : value }),
    },
  ];

  const resetAll = () => {
    clearSearch();
    setParams({ tier: null, status: null, field: null, search: null });
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 pb-8">
      <PageHeading
        title="Case Saya"
        description="Semua case yang kamu mulai atau beli, beserta status dan langkah berikutnya."
        action={
          <Button asChild variant="outline" size="pill" className="active:scale-[0.98]">
            <Link href={PATHS.cases}>Cari case baru</Link>
          </Button>
        }
      />

      <div className="grid gap-4">
        <FilterTabs
          ariaLabel="Jenis case"
          options={tierTabs}
          value={tier}
          onChange={(value) => setParams({ tier: value === 'all' ? null : value })}
        />
        <SearchToolbar
          search={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Cari case saya"
          sortOptions={SORT_OPTIONS}
          sort={sort}
          onSortChange={(value) => setParams({ sort: value === 'recent' ? null : value })}
          filterSections={filterSections}
          onResetFilters={() => setParams({ status: null, field: null })}
        />
      </div>

      <section aria-label="Daftar case saya" className="grid gap-4">
        {isLoading ? (
          <ListSkeleton count={5} />
        ) : isError || !enrollments ? (
          <ErrorState onRetry={() => refetch()} />
        ) : enrollments.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={hasFilters ? 'Tidak ada case yang cocok' : 'Kamu belum punya case'}
            description={
              hasFilters
                ? 'Coba kata kunci lain, atau ubah status dan bidang di filter.'
                : 'Mulai dari AI Case Study gratis untuk mengenali skill gap-mu.'
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="pill" onClick={resetAll}>
                  Hapus semua filter
                </Button>
              ) : (
                <Button asChild size="pill">
                  <Link href={`${PATHS.cases}?tier=ai`}>Pilih AI Case</Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <p className="text-sm text-ink-subtle" aria-live="polite">
              <span className="font-mono text-ink tabular-nums">{enrollments.length}</span> case
            </p>
            <EnrollmentList items={enrollments} />
          </>
        )}
      </section>
    </div>
  );
}
